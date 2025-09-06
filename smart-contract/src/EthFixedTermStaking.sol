// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EthFixedTermStaking
 * @notice Users stake native ETH for fixed durations and receive principal + bonus% at maturity.
 *         Early withdraw returns principal only. Rewards are paid from this contract's ETH balance.
 *
 * @dev OWNER can withdraw ANY amount at any time (operational risk by design).
 *      You must keep the contract funded to avoid user withdrawal reverts.
 */
contract EthFixedTermStaking is Ownable, Pausable, ReentrancyGuard {
    // ---------- Custom errors ----------
    error BadPlan();
    error AmountZero();
    error BadPositionId();
    error AlreadyWithdrawn();
    error NotMatured();
    error AlreadyMatured();
    error InsufficientRewards(); // during payout attempt
    error InsufficientRewardCapacity(uint256 pool, uint256 required); // on stake admission
    error ToZeroAddress();
    error NoValue();

    // ---------- Fixed plans (hard-coded) ----------
    // planId = 0: 1 day, +20%
    // planId = 1: 2 days, +50%
    // planId = 2: 3 days, +100%
    uint40  private constant PLAN0_DURATION = 1 days;
    uint16  private constant PLAN0_BPS      = 2000;  // 20%
    uint40  private constant PLAN1_DURATION = 2 days;
    uint16  private constant PLAN1_BPS      = 5000;  // 50%
    uint40  private constant PLAN2_DURATION = 3 days;
    uint16  private constant PLAN2_BPS      = 10000; // 100%

    // ---------- Types ----------
    struct Position {
        uint128 amount;    // staked ETH in wei
        uint128 bonusWei;  // SNAPSHOTTED bonus in wei (immutable promise)
        uint40  start;
        uint40  unlock;    // fixed at stake time
        uint16  planId;    // 0..2
        bool    withdrawn;
    }

    // ---------- Storage ----------
    mapping(address => Position[]) public userPositions;

    // Solvency bookkeeping
    uint256 public totalPrincipalLocked;
    uint256 public totalBonusLiability;

    // ---------- Events ----------
    event Staked(address indexed user, uint16 indexed planId, uint256 amount, uint256 indexed positionId, uint40 unlockAt);
    event Withdrawn(address indexed user, uint256 indexed positionId, uint256 principal, uint256 bonus);
    event EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 principal);
    event RewardsFunded(address indexed from, uint256 amount);
    event AdminWithdraw(address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {
        _pause(); // Start paused for safety
    }

    // ---------- Admin ----------
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Fund rewards by sending ETH; emits event for indexing.
    function fundRewards() external payable onlyOwner {
        if (msg.value == 0) revert NoValue();
        emit RewardsFunded(msg.sender, msg.value);
        // rewardsPool() increases implicitly as balance increases
    }

    /**
     * @notice OWNER WITHDRAW ANY AMOUNT (can be full balance). This can break solvency.
     * @dev No solvency checks. If you drain funds, user withdraws may revert until you top up again.
     */
    function adminWithdrawAny(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ToZeroAddress();
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit AdminWithdraw(to, amount);
    }

    // ---------- User ----------
    /**
     * @dev Admission control enforces solvency at STAKE TIME:
     *      rewardsPool = max(balance - totalPrincipalLocked, 0)
     * After a new stake, rewardsPool is unchanged (balance and principal both go up by the same amount),
     * but liability increases by newBonus. We require rewardsPool >= totalBonusLiability + newBonus.
     * NOTE: Admin can later withdraw funds and violate solvency; then withdrawals can revert until re-funded.
     */
    function stake(uint16 planId) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert AmountZero();

        (uint40 lockDuration, uint16 bonusBps) = _getPlan(planId);

        uint256 principal = msg.value;
        uint256 newBonus  = (principal * uint256(bonusBps)) / 10000;

        // Check capacity before accepting the stake
        // We need to check if the current pool (excluding the incoming principal) can cover the new bonus
        uint256 currentBalance = address(this).balance - principal; // balance before this transaction
        uint256 currentPool = currentBalance > totalPrincipalLocked ? currentBalance - totalPrincipalLocked : 0;
        uint256 required = totalBonusLiability + newBonus;
        if (currentPool < required) revert InsufficientRewardCapacity(currentPool, required);

        // Effects
        unchecked {
            totalPrincipalLocked += principal;
            totalBonusLiability += newBonus;
        }

        uint40 start = uint40(block.timestamp);
        uint40 unlock = start + lockDuration;

        Position memory pos = Position({
            amount:    uint128(principal),
            bonusWei:  uint128(newBonus),  // SNAPSHOT
            start:     start,
            unlock:    unlock,
            planId:    planId,
            withdrawn: false
        });

        userPositions[msg.sender].push(pos);
        uint256 positionId = userPositions[msg.sender].length - 1;
        emit Staked(msg.sender, planId, principal, positionId, unlock);
    }

    function withdraw(uint256 positionId) external nonReentrant {
        Position storage pos = _position(msg.sender, positionId);
        if (pos.withdrawn) revert AlreadyWithdrawn();
        if (block.timestamp < pos.unlock) revert NotMatured();

        uint256 principal = uint256(pos.amount);
        uint256 bonus     = uint256(pos.bonusWei);

        // Effects first
        pos.withdrawn = true;
        unchecked {
            totalPrincipalLocked -= principal;
            totalBonusLiability -= bonus;
        }

        // Payout (can revert if admin drained funds)
        if (address(this).balance < principal + bonus) revert InsufficientRewards();

        (bool ok, ) = payable(msg.sender).call{value: principal + bonus}("");
        require(ok, "payout failed");

        emit Withdrawn(msg.sender, positionId, principal, bonus);
    }

    function emergencyWithdraw(uint256 positionId) external nonReentrant {
        Position storage pos = _position(msg.sender, positionId);
        if (pos.withdrawn) revert AlreadyWithdrawn();
        if (block.timestamp >= pos.unlock) revert AlreadyMatured();

        uint256 principal = uint256(pos.amount);
        uint256 bonusForgone = uint256(pos.bonusWei);

        pos.withdrawn = true;
        unchecked {
            totalPrincipalLocked -= principal;
            totalBonusLiability  -= bonusForgone;
        }

        (bool ok, ) = payable(msg.sender).call{value: principal}("");
        require(ok, "refund failed");

        emit EmergencyWithdrawn(msg.sender, positionId, principal);
    }

    // ---------- Views (for UI) ----------
    /// @notice All positions for a user (UI can render a table and countdowns).
    function positionsOf(address user) external view returns (Position[] memory) {
        return userPositions[user];
    }

    /// @notice Principal, bonus (snapshotted), matured?
    function pendingPayout(address user, uint256 positionId)
        external
        view
        returns (uint256 principal, uint256 bonus, bool matured)
    {
        Position memory pos = userPositions[user][positionId];
        principal = uint256(pos.amount);
        bonus     = uint256(pos.bonusWei);
        matured   = (block.timestamp >= pos.unlock) && !pos.withdrawn;
    }

    /// @notice Seconds remaining until unlock (0 if already matured).
    function timeToUnlock(address user, uint256 positionId) external view returns (uint256) {
        Position memory pos = userPositions[user][positionId];
        if (block.timestamp >= pos.unlock || pos.withdrawn) return 0;
        return uint256(pos.unlock) - block.timestamp;
    }

    /// @notice Current rewards pool (excludes principals), clamped to zero.
    function rewardsPool() public view returns (uint256) {
        uint256 bal = address(this).balance;
        if (bal <= totalPrincipalLocked) return 0;
        unchecked { return bal - totalPrincipalLocked; }
    }

    /// @notice Fixed plan count (always 3).
    function plansCount() external pure returns (uint256) {
        return 3;
    }

    /// @notice Read-only plan info: (duration, bonusBps) for planId 0..2.
    function planInfo(uint16 planId) external pure returns (uint40 duration, uint16 bonusBps) {
        return _getPlan(planId);
    }

    // ---------- Internals ----------
    function _position(address user, uint256 positionId) internal view returns (Position storage) {
        if (positionId >= userPositions[user].length) revert BadPositionId();
        return userPositions[user][positionId];
    }

    function _getPlan(uint16 planId) private pure returns (uint40 duration, uint16 bonusBps) {
        if (planId == 0) return (PLAN0_DURATION, PLAN0_BPS);
        if (planId == 1) return (PLAN1_DURATION, PLAN1_BPS);
        if (planId == 2) return (PLAN2_DURATION, PLAN2_BPS);
        revert BadPlan();
    }

    receive() external payable {
        // allow direct ETH top-ups (e.g., owner sends ETH without calling fundRewards)
        emit RewardsFunded(msg.sender, msg.value);
    }
}
