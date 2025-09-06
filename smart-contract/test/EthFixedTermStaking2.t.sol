// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "forge-std/console2.sol";

import {EthFixedTermStaking} from "../src/EthFixedTermStaking.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * Fuzz tests for EthFixedTermStaking (hard-coded plans, snapshotted bonus, pre-stake capacity check).
 *
 * Run:
 *   forge test -vv
 *
 * Notes:
 * - We constrain fuzzed amounts with uint96 and upper bounds to keep them within uint128 casts and practical gas.
 * - We deliberately branch on expected success or revert based on the *pre-stake* pool rule.
 */
contract EthFixedTermStaking_Fuzz is Test {
    EthFixedTermStaking staking;

    address owner;
    address user;
    address user2;

    // Mirrors of plan ids & params (must match the contract)
    uint16 constant PLAN0 = 0; // 1d, +20%
    uint16 constant PLAN1 = 1; // 2d, +50%
    uint16 constant PLAN2 = 2; // 3d, +100%

    uint40 constant PLAN0_DURATION = 1 days;
    uint16 constant PLAN0_BPS      = 2000;
    uint40 constant PLAN1_DURATION = 2 days;
    uint16 constant PLAN1_BPS      = 5000;
    uint40 constant PLAN2_DURATION = 3 days;
    uint16 constant PLAN2_BPS      = 10000;

    event Staked(address indexed user, uint16 indexed planId, uint256 amount, uint256 indexed positionId, uint40 unlockAt);
    event Withdrawn(address indexed user, uint256 indexed positionId, uint256 principal, uint256 bonus);
    event EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 principal);
    event RewardsFunded(address indexed from, uint256 amount);
    event AdminWithdraw(address indexed to, uint256 amount);

    function setUp() public {
        owner = address(0xA11CE0);
        user  = address(0xC0FFEE);
        user2 = address(0xF00D);

        vm.deal(owner, 1_000 ether);
        vm.deal(user,  1_000 ether);
        vm.deal(user2, 1_000 ether);

        vm.prank(owner);
        staking = new EthFixedTermStaking();
        vm.label(owner, "OWNER");
        vm.label(user,  "USER");
        vm.label(user2, "USER2");
        vm.label(address(staking), "STAKING");
    }

    // ---------------- helpers ----------------

    function _bpsFor(uint16 planId) internal pure returns (uint16) {
        if (planId == PLAN0) return PLAN0_BPS;
        if (planId == PLAN1) return PLAN1_BPS;
        if (planId == PLAN2) return PLAN2_BPS;
        // map any value to a valid plan
        uint16 m = planId % 3;
        if (m == 0) return PLAN0_BPS;
        if (m == 1) return PLAN1_BPS;
        return PLAN2_BPS;
    }

    function _durFor(uint16 planId) internal pure returns (uint40) {
        if (planId == PLAN0) return PLAN0_DURATION;
        if (planId == PLAN1) return PLAN1_DURATION;
        if (planId == PLAN2) return PLAN2_DURATION;
        uint16 m = planId % 3;
        if (m == 0) return PLAN0_DURATION;
        if (m == 1) return PLAN1_DURATION;
        return PLAN2_DURATION;
    }

    function _normPlan(uint16 planId) internal pure returns (uint16) {
        return uint16(planId % 3);
    }

    function _bonus(uint256 principal, uint16 bps) internal pure returns (uint256) {
        return (principal * uint256(bps)) / 10000;
    }

    // ---------------- fuzz tests ----------------

    /// @dev Fuzz stake admission using *pre-stake* pool math.
    function testFuzz_Stake_AdmitsIffPoolCoversNewBonus(uint96 fundSeed, uint96 amtSeed, uint16 planSeed) public {
        // Normalize inputs
        uint256 fund = uint256(fundSeed % 1_000 ether); // cap to keep gas predictable
        uint256 amt  = uint256(amtSeed % 100 ether);    // cap deposit
        uint16 plan  = _normPlan(planSeed);
        uint16 bps   = _bpsFor(plan);

        vm.assume(amt > 0); // zero amount will revert for a different reason

        // Fund rewards & unpause
        vm.startPrank(owner);
        if (fund > 0) {
            staking.fundRewards{value: fund}();
        }
        staking.unpause();
        vm.stopPrank();

        // Pre-stake pool = fund (no principals yet)
        uint256 newBonus = _bonus(amt, bps);
        uint256 currentPool = fund; // since totalPrincipalLocked is zero before any stake

        if (currentPool < newBonus) {
            // Expect revert with InsufficientRewardCapacity
            vm.prank(user);
            vm.expectRevert(
                abi.encodeWithSelector(
                    EthFixedTermStaking.InsufficientRewardCapacity.selector,
                    currentPool,
                    newBonus
                )
            );
            staking.stake{value: amt}(plan);
        } else {
            // Should succeed; validates we didn't accidentally count msg.value into pool
            vm.prank(user);
            staking.stake{value: amt}(plan);

            // After stake: balance = fund + amt; principals = amt; pool = fund
            assertEq(staking.rewardsPool(), fund, "post-stake pool equals pre-stake pool");

            (uint256 p, uint256 b, bool matured) = staking.pendingPayout(user, 0);
            assertEq(p, amt, "snap principal");
            assertEq(b, newBonus, "snap bonus");
            assertFalse(matured, "not matured yet");
        }
    }

    /// @dev Fuzz two stakes; check totals & snapshots when both should be admitted.
    function testFuzz_MultiStakeTotals(uint96 fundSeed, uint96 a1Seed, uint96 a2Seed, uint16 p1Seed, uint16 p2Seed) public {
        uint256 fund = uint256(fundSeed % 1_000 ether);
        uint256 a1   = uint256(a1Seed % 100 ether);
        uint256 a2   = uint256(a2Seed % 100 ether);
        uint16  p1   = _normPlan(p1Seed);
        uint16  p2   = _normPlan(p2Seed);

        vm.assume(a1 > 0 && a2 > 0);

        uint16 b1 = _bpsFor(p1);
        uint16 b2 = _bpsFor(p2);
        uint256 bonus1 = _bonus(a1, b1);
        uint256 bonus2 = _bonus(a2, b2);

        // Require funding covers both bonuses (since pool stays = fund across accepted stakes)
        vm.assume(fund >= bonus1 + bonus2);

        vm.startPrank(owner);
        if (fund > 0) staking.fundRewards{value: fund}();
        staking.unpause();
        vm.stopPrank();

        // stake #1
        vm.prank(user);
        staking.stake{value: a1}(p1);
        // stake #2
        vm.prank(user);
        staking.stake{value: a2}(p2);

        // Totals
        assertEq(staking.totalPrincipalLocked(), a1 + a2);
        assertEq(staking.totalBonusLiability(), bonus1 + bonus2);

        // Pool remains equal to initial fund (since principals offset)
        assertEq(staking.rewardsPool(), fund);

        // Check snapshots
        (uint256 pA, uint256 bA,) = staking.pendingPayout(user, 0);
        (uint256 pB, uint256 bB,) = staking.pendingPayout(user, 1);
        assertEq(pA, a1); assertEq(bA, bonus1);
        assertEq(pB, a2); assertEq(bB, bonus2);
    }

    /// @dev Fuzz early exit path: emergency withdraw forfeits bonus and updates liabilities.
    function testFuzz_EmergencyWithdraw_ForfeitsBonus(uint96 fundSeed, uint96 amtSeed, uint16 planSeed) public {
        uint256 fund = uint256(fundSeed % 1_000 ether);
        uint256 amt  = uint256(amtSeed % 100 ether);
        uint16  plan = _normPlan(planSeed);
        uint16  bps  = _bpsFor(plan);

        vm.assume(amt > 0);
        uint256 bonus = _bonus(amt, bps);
        vm.assume(fund >= bonus); // admit stake

        vm.startPrank(owner);
        if (fund > 0) {
            staking.fundRewards{value: fund}();
        }
        staking.unpause();
        vm.stopPrank();

        vm.prank(user);
        staking.stake{value: amt}(plan);

        uint256 liabBefore = staking.totalBonusLiability();
        uint256 princBefore = staking.totalPrincipalLocked();

        // Emergency withdraw before maturity
        vm.prank(user);
        staking.emergencyWithdraw(0);

        assertEq(staking.totalBonusLiability(), liabBefore - bonus, "liability reduced by snap bonus");
        assertEq(staking.totalPrincipalLocked(), princBefore - amt, "principal reduced");
        // second withdraw attempts should revert
        vm.prank(user);
        vm.expectRevert(EthFixedTermStaking.AlreadyWithdrawn.selector);
        staking.emergencyWithdraw(0);
    }

    /// @dev Fuzz normal withdraw after maturity; verify payout equals snap principal+bonus.
    function testFuzz_Withdraw_PaysSnapshotAfterMaturity(uint96 fundSeed, uint96 amtSeed, uint16 planSeed) public {
        uint256 fund = uint256(fundSeed % 1_000 ether);
        uint256 amt  = uint256(amtSeed % 100 ether);
        uint16  plan = _normPlan(planSeed);
        uint16  bps  = _bpsFor(plan);
        uint40  dur  = _durFor(plan);

        vm.assume(amt > 0);
        uint256 bonus = _bonus(amt, bps);
        vm.assume(fund >= bonus); // admit

        vm.startPrank(owner);
        if (fund > 0) {
            staking.fundRewards{value: fund}();
        }
        staking.unpause();
        vm.stopPrank();

        vm.prank(user);
        staking.stake{value: amt}(plan);

        // Snapshot expected payout
        (uint256 p0, uint256 b0, bool matured0) = staking.pendingPayout(user, 0);
        assertEq(p0, amt); assertEq(b0, bonus); assertFalse(matured0);

        // warp to maturity
        vm.warp(block.timestamp + dur + 1);

        uint256 balBefore = user.balance;
        uint256 liabBefore = staking.totalBonusLiability();
        uint256 princBefore = staking.totalPrincipalLocked();

        vm.prank(user);
        staking.withdraw(0);

        assertEq(user.balance, balBefore + p0 + b0, "received principal+bonus snapshot");
        assertEq(staking.totalBonusLiability(), liabBefore - b0, "liability reduced");
        assertEq(staking.totalPrincipalLocked(), princBefore - p0, "principal reduced");

        // second withdraw should revert
        vm.prank(user);
        vm.expectRevert(EthFixedTermStaking.AlreadyWithdrawn.selector);
        staking.withdraw(0);
    }

    /// @dev timeToUnlock should be non-increasing over time and clamp to zero at/after unlock.
    function testFuzz_TimeToUnlockMonotonic(uint96 fundSeed, uint96 amtSeed, uint16 planSeed, uint64 delta1, uint64 delta2) public {
        uint256 fund = uint256(fundSeed % 1_000 ether);
        uint256 amt  = uint256(amtSeed % 100 ether);
        uint16  plan = _normPlan(planSeed);
        uint40  dur  = _durFor(plan);
        uint16  bps  = _bpsFor(plan);

        vm.assume(amt > 0);
        uint256 bonus = _bonus(amt, bps);
        vm.assume(fund >= bonus); // admit

        vm.startPrank(owner);
        if (fund > 0) {
            staking.fundRewards{value: fund}();
        }
        staking.unpause();
        vm.stopPrank();

        vm.prank(user);
        staking.stake{value: amt}(plan);

        uint256 t0 = staking.timeToUnlock(user, 0);
        assertLe(t0, dur);
        // advance by delta1
        vm.warp(block.timestamp + uint256(delta1));
        uint256 t1 = staking.timeToUnlock(user, 0);
        assertLe(t1, t0, "t1 <= t0");

        // advance again by delta2
        vm.warp(block.timestamp + uint256(delta2));
        uint256 t2 = staking.timeToUnlock(user, 0);
        assertLe(t2, t1, "t2 <= t1");

        // after full duration, it must clamp to 0
        vm.warp(block.timestamp + (t2 + 1));
        assertEq(staking.timeToUnlock(user, 0), 0);
    }

    /// @dev Paused state must always block staking irrespective of fuzzed inputs.
    function testFuzz_PausedAlwaysBlocksStake(uint96 amtSeed, uint16 planSeed) public {
        uint256 amt  = uint256(amtSeed % 100 ether);
        uint16  plan = _normPlan(planSeed);
        vm.assume(amt > 0);

        // contract starts paused; staking should revert
        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        staking.stake{value: amt}(plan);

        // unpause then pause again to confirm behavior
        vm.prank(owner);
        staking.unpause();
        vm.prank(owner);
        staking.pause();

        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        staking.stake{value: amt}(plan);
    }

    /// @dev If owner drains below required, matured withdraw reverts until re-funded (fuzz payout sizes).
    function testFuzz_WithdrawFailsIfUnderfundedThenSucceedsAfterTopup(uint96 fundSeed, uint96 amtSeed, uint16 planSeed, uint96 drainSeed, uint96 topupSeed) public {
        uint256 fund  = uint256(fundSeed % 1_000 ether);
        uint256 amt   = uint256(amtSeed % 100 ether);
        uint16  plan  = _normPlan(planSeed);
        uint16  bps   = _bpsFor(plan);
        uint40  dur   = _durFor(plan);

        vm.assume(amt > 0);
        uint256 bonus = _bonus(amt, bps);
        vm.assume(fund >= bonus); // admit

        vm.startPrank(owner);
        if (fund > 0) {
            staking.fundRewards{value: fund}();
        }
        staking.unpause();
        vm.stopPrank();

        vm.prank(user);
        staking.stake{value: amt}(plan);

        vm.warp(block.timestamp + dur + 1);

        // drain an arbitrary amount but keep it <= current balance - 1 wei guard
        uint256 bal = address(staking).balance;
        uint256 drain = uint256(drainSeed % bal);
        if (drain > 0) {
            vm.prank(owner);
            staking.adminWithdrawAny(payable(owner), drain);
        }

        // If balance < amt+bonus, withdraw must revert; otherwise it succeeds.
        uint256 need = amt + bonus;
        if (address(staking).balance < need) {
            vm.prank(user);
            vm.expectRevert(EthFixedTermStaking.InsufficientRewards.selector);
            staking.withdraw(0);

            // top up some amount and try again (ensure enough)
            uint256 missing = need - address(staking).balance;
            uint256 topup = uint256(topupSeed % (missing + 1 ether)) + missing;
            vm.prank(owner);
            if (topup > 0) {
                staking.fundRewards{value: topup}();
            }

            vm.prank(user);
            staking.withdraw(0);
        } else {
            vm.prank(user);
            staking.withdraw(0);
        }
    }
}
