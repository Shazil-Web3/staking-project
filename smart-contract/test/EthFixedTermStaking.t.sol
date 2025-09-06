// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "forge-std/console2.sol";

import {EthFixedTermStaking} from "../src/EthFixedTermStaking.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * Foundry test suite for EthFixedTermStaking (fixed-plan, snapshotted bonuses).
 *
 * Assumptions:
 * - Contract compiled at ../src/EthFixedTermStaking.sol
 * - Using Foundry (forge-std).
 *
 * Run:
 *   forge test -vv
 */
contract EthFixedTermStakingTest is Test {
    EthFixedTermStaking staking;

    address owner;
    address alice;
    address bob;
    address treasury; // receiver for adminWithdrawAny

    // Plan constants (should match the contract)
    uint16 constant PLAN0 = 0; // 1 day, +20%
    uint16 constant PLAN1 = 1; // 2 days, +50%
    uint16 constant PLAN2 = 2; // 3 days, +100%

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
        alice = address(0xA11CE1);
        bob   = address(0xB0B00B);
        treasury = address(0xFACE);

        // give test ETH to owner and users
        vm.deal(owner, 1_000 ether);
        vm.deal(alice, 1_000 ether);
        vm.deal(bob,   1_000 ether);
        vm.deal(treasury, 0 ether);

        // Deploy as owner
        vm.prank(owner);
        staking = new EthFixedTermStaking();

        // label addresses for nicer traces
        vm.label(owner, "OWNER");
        vm.label(alice, "ALICE");
        vm.label(bob,   "BOB");
        vm.label(treasury, "TREASURY");
        vm.label(address(staking), "STAKING");
    }

    // ------------- Helper math -------------

    function calcBonus(uint256 principal, uint16 bps) internal pure returns (uint256) {
        return (principal * uint256(bps)) / 10000;
    }

    // ------------- Basic contract shape -------------

    function test_PlansCountAndInfo() public view {
        // plansCount is always 3
        uint256 count = staking.plansCount();
        assertEq(count, 3, "plansCount must be 3");

        (uint40 d0, uint16 b0) = staking.planInfo(PLAN0);
        assertEq(d0, PLAN0_DURATION, "plan0 duration");
        assertEq(b0, PLAN0_BPS, "plan0 bps");

        (uint40 d1, uint16 b1) = staking.planInfo(PLAN1);
        assertEq(d1, PLAN1_DURATION, "plan1 duration");
        assertEq(b1, PLAN1_BPS, "plan1 bps");

        (uint40 d2, uint16 b2) = staking.planInfo(PLAN2);
        assertEq(d2, PLAN2_DURATION, "plan2 duration");
        assertEq(b2, PLAN2_BPS, "plan2 bps");
    }

    // ------------- Funding & rewardsPool -------------

    function test_FundRewards_IncreasesPool_EmitsEvent() public {
        assertEq(staking.rewardsPool(), 0, "initial pool should be 0");

        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true);
        emit RewardsFunded(owner, 100 ether);
        staking.fundRewards{value: 100 ether}();
        vm.stopPrank();

        // After funding, with no stakes, pool == balance
        assertEq(address(staking).balance, 100 ether, "balance");
        assertEq(staking.rewardsPool(), 100 ether, "pool should equal balance");
    }

    function test_FundRewards_RevertOnZero() public {
        vm.prank(owner);
        vm.expectRevert(EthFixedTermStaking.NoValue.selector);
        staking.fundRewards{value: 0}();
    }

    function test_RewardsPool_ClampedToZero_WhenBalanceBelowPrincipals() public {
        // fund 10, stake 10 => principals=10, pool=0
        vm.prank(owner);
        staking.fundRewards{value: 10 ether}();

        vm.prank(owner);
        staking.unpause();

        // Alice stakes 10 ETH into plan 0 (+20% => 2 ETH bonus)
        vm.startPrank(alice);
        vm.expectEmit(true, true, true, true);
        // positionId will be 0 for Alice; unlockAt = block.timestamp + 1 day
        uint40 unlockAt = uint40(block.timestamp + PLAN0_DURATION);
        emit Staked(alice, PLAN0, 10 ether, 0, unlockAt);
        staking.stake{value: 10 ether}(PLAN0);
        vm.stopPrank();

        // After stake: balance = 20, principal=10, pool should be 10 (20 - 10)
        assertEq(address(staking).balance, 20 ether, "post stake balance");
        assertEq(staking.rewardsPool(), 10 ether, "post stake pool");

        // Owner drains 15 ETH, leaving balance=5
        vm.prank(owner);
        staking.adminWithdrawAny(payable(treasury), 15 ether);
        assertEq(address(staking).balance, 5 ether, "drained balance");

        // rewardsPool should clamp to zero because totalPrincipalLocked=10 > balance=5
        assertEq(staking.rewardsPool(), 0, "pool clamped to zero");
    }

    // ------------- Pause behavior -------------

    function test_PauseBlocksStake_ButWithdrawStillAllowed() public {
        // fund enough, pause ON (default constructor state is paused; we test both)
        vm.prank(owner);
        staking.fundRewards{value: 5 ether}();

        // By default contract is paused (from OZ Pausable, constructor did not unpause)
        // Attempting to stake should revert with EnforcedPause()
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        staking.stake{value: 1 ether}(PLAN0);

        // Unpause, allow a stake, then re-pause and allow withdraw
        vm.prank(owner);
        staking.unpause();

        // Stake 1 ETH plan0
        vm.prank(alice);
        staking.stake{value: 1 ether}(PLAN0);

        // Advance time to maturity
        vm.warp(block.timestamp + PLAN0_DURATION + 1);

        // Pause again
        vm.prank(owner);
        staking.pause();

        // Withdraw should still work while paused (we don't guard withdraw with whenNotPaused)
        vm.prank(alice);
        staking.withdraw(0);
    }

    // ------------- Staking admission checks -------------

    function test_Stake_RevertsOnAmountZero() public {
        vm.prank(owner);
        staking.unpause();

        vm.prank(alice);
        vm.expectRevert(EthFixedTermStaking.AmountZero.selector);
        staking.stake{value: 0}(PLAN0);
    }

    function test_Stake_RevertsOnBadPlan() public {
        vm.prank(owner);
        staking.unpause();

        vm.prank(alice);
        // planId 3 doesn't exist
        vm.expectRevert(EthFixedTermStaking.BadPlan.selector);
        staking.stake{value: 1 ether}(3);
    }

    function test_Stake_RevertsWhenInsufficientRewardCapacity() public {
        // No funding => rewardsPool = 0
        vm.prank(owner);
        staking.unpause();

        // Alice tries to stake 1 ETH in plan0 => newBonus = 0.2 ETH
        // required = liability(0) + 0.2 ETH; pool=0 => revert InsufficientRewardCapacity(pool, required)
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(EthFixedTermStaking.InsufficientRewardCapacity.selector, uint256(0), calcBonus(1 ether, PLAN0_BPS))
        );
        staking.stake{value: 1 ether}(PLAN0);
    }

    function test_Stake_SucceedsWhenPoolCoversNewLiability_SnapshotsBonus_EmitsEvent() public {
        // Fund 10 ETH; unpause
        vm.startPrank(owner);
        staking.fundRewards{value: 10 ether}();
        staking.unpause();
        vm.stopPrank();

        // Alice stakes 5 ETH in plan2 (100% => bonus 5 ETH)
        uint256 principal = 5 ether;
        uint256 expectedBonus = calcBonus(principal, PLAN2_BPS);

        vm.startPrank(alice);
        // expect event
        vm.expectEmit(true, true, true, true);
        uint40 unlockAt = uint40(block.timestamp + PLAN2_DURATION);
        emit Staked(alice, PLAN2, principal, 0, unlockAt);

        staking.stake{value: principal}(PLAN2);
        vm.stopPrank();

        // Check pendingPayout uses snapshotted bonus
        (uint256 p, uint256 b, bool matured) = staking.pendingPayout(alice, 0);
        assertEq(p, principal, "principal snapshot");
        assertEq(b, expectedBonus, "bonus snapshot (wei)");
        assertEq(matured, false, "not matured yet");

        // Rewards accounting
        // After stake: contract balance increased by principal -> 15, principals=5, pool=10
        // Liability increased by expectedBonus (5)
        assertEq(address(staking).balance, 15 ether, "balance after stake");
        assertEq(staking.rewardsPool(), 10 ether, "pool after stake");
    }

    function test_MultipleUsers_MultipleStakes() public {
        // Fund 100 ETH; unpause
        vm.startPrank(owner);
        staking.fundRewards{value: 100 ether}();
        staking.unpause();
        vm.stopPrank();

        // Alice stakes twice
        vm.startPrank(alice);
        staking.stake{value: 3 ether}(PLAN0); // bonus 0.6
        staking.stake{value: 2 ether}(PLAN1); // bonus 1.0
        vm.stopPrank();

        // Bob stakes once
        vm.prank(bob);
        staking.stake{value: 1 ether}(PLAN2); // bonus 1.0

        // Positions length checks
        EthFixedTermStaking.Position[] memory a = staking.positionsOf(alice);
        EthFixedTermStaking.Position[] memory bpos = staking.positionsOf(bob);
        assertEq(a.length, 2, "alice positions");
        assertEq(bpos.length, 1, "bob positions");

        // Pending payouts reflect separate snapshots
        (uint256 ap0, uint256 ab0, ) = staking.pendingPayout(alice, 0);
        (uint256 ap1, uint256 ab1, ) = staking.pendingPayout(alice, 1);
        (uint256 bp0, uint256 bb0, ) = staking.pendingPayout(bob, 0);

        assertEq(ap0, 3 ether);
        assertEq(ab0, calcBonus(3 ether, PLAN0_BPS)); // 0.6
        assertEq(ap1, 2 ether);
        assertEq(ab1, calcBonus(2 ether, PLAN1_BPS)); // 1.0
        assertEq(bp0, 1 ether);
        assertEq(bb0, calcBonus(1 ether, PLAN2_BPS)); // 1.0
    }

    // ------------- Withdraw paths -------------

    function test_Withdraw_RevertsIfNotMatured() public {
        vm.startPrank(owner);
        staking.fundRewards{value: 10 ether}();
        staking.unpause();
        vm.stopPrank();

        vm.prank(alice);
        staking.stake{value: 1 ether}(PLAN0);

        // immediate withdraw should revert
        vm.prank(alice);
        vm.expectRevert(EthFixedTermStaking.NotMatured.selector);
        staking.withdraw(0);
    }

    function test_EmergencyWithdraw_BeforeMaturity_ReturnsPrincipal_ReducesLiability_EmitsEvent() public {
        vm.startPrank(owner);
        staking.fundRewards{value: 10 ether}();
        staking.unpause();
        vm.stopPrank();

        // stake 2 ETH in plan1 (+50% => 1 ETH bonus)
        vm.prank(alice);
        staking.stake{value: 2 ether}(PLAN1);

        // capture totals
        (uint256 principal, uint256 bonus, bool matured) = staking.pendingPayout(alice, 0);
        assertEq(principal, 2 ether);
        assertEq(bonus, 1 ether);
        assertFalse(matured);

        uint256 liabilityBefore = staking.totalBonusLiability();
        uint256 principalBefore = staking.totalPrincipalLocked();

        // Expect event
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit EmergencyWithdrawn(alice, 0, 2 ether);
        staking.emergencyWithdraw(0);

        // Liability reduced by 1 ETH; principal reduced by 2 ETH
        assertEq(staking.totalBonusLiability(), liabilityBefore - 1 ether, "liability reduced");
        assertEq(staking.totalPrincipalLocked(), principalBefore - 2 ether, "principal reduced");

        // Position is withdrawn
        EthFixedTermStaking.Position[] memory arr = staking.positionsOf(alice);
        assertTrue(arr[0].withdrawn, "position withdrawn flag set");
    }

    function test_EmergencyWithdraw_RevertsIfAlreadyMatured() public {
        vm.startPrank(owner);
        staking.fundRewards{value: 10 ether}();
        staking.unpause();
        vm.stopPrank();

        vm.prank(alice);
        staking.stake{value: 1 ether}(PLAN0);

        // advance past maturity
        vm.warp(block.timestamp + PLAN0_DURATION + 1);

        vm.prank(alice);
        vm.expectRevert(EthFixedTermStaking.AlreadyMatured.selector);
        staking.emergencyWithdraw(0);
    }

    function test_Withdraw_AfterMaturity_PaysPrincipalPlusBonus_UpdatesAccounting_EmitsEvent() public {
        vm.startPrank(owner);
        staking.fundRewards{value: 100 ether}();
        staking.unpause();
        vm.stopPrank();

        // Alice stakes 4 ETH in plan2 => bonus 4 ETH
        vm.prank(alice);
        staking.stake{value: 4 ether}(PLAN2);

        // move time to after maturity
        vm.warp(block.timestamp + PLAN2_DURATION + 1);

        // capture balances
        uint256 balBefore = alice.balance;
        uint256 liabBefore = staking.totalBonusLiability();
        uint256 princBefore = staking.totalPrincipalLocked();

        // Expect event
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit Withdrawn(alice, 0, 4 ether, 4 ether);
        staking.withdraw(0);

        // Alice received 8 ETH
        assertEq(alice.balance, balBefore + 8 ether, "received principal+bonus");

        // Accounting updated
        assertEq(staking.totalBonusLiability(), liabBefore - 4 ether, "liability reduced by bonus");
        assertEq(staking.totalPrincipalLocked(), princBefore - 4 ether, "principal reduced by amount");

        // Withdrawing again should revert
        vm.prank(alice);
        vm.expectRevert(EthFixedTermStaking.AlreadyWithdrawn.selector);
        staking.withdraw(0);
    }

    function test_Withdraw_RevertsIfContractUnderfunded_ThenSucceedsAfterTopUp() public {
        // Fund 10 ether, unpause
        vm.startPrank(owner);
        staking.fundRewards{value: 10 ether}();
        staking.unpause();
        vm.stopPrank();

        // Alice stakes 5 ether in plan2 => bonus 5
        vm.prank(alice);
        staking.stake{value: 5 ether}(PLAN2);

        // Move past maturity
        vm.warp(block.timestamp + PLAN2_DURATION + 1);

        // Owner drains almost everything: balance was 15 (10 fund + 5 principal)
        // To make underfunded: payout requires 10, so drain to below 10
        vm.prank(owner);
        staking.adminWithdrawAny(payable(treasury), 8 ether);
        // Remaining balance = 7 ether

        // Alice tries to withdraw -> revert InsufficientRewards
        vm.prank(alice);
        vm.expectRevert(EthFixedTermStaking.InsufficientRewards.selector);
        staking.withdraw(0);

        // Owner tops up via fundRewards
        vm.prank(owner);
        staking.fundRewards{value: 5 ether}(); // now balance should be enough (12)

        // Now Alice withdraws successfully
        vm.prank(alice);
        staking.withdraw(0);
    }

    // ------------- Utility & Views -------------

    function test_PendingPayout_TimeToUnlock_AndPositionsOf() public {
        vm.startPrank(owner);
        staking.fundRewards{value: 10 ether}();
        staking.unpause();
        vm.stopPrank();

        // Bob stakes 2 ETH in plan0
        vm.prank(bob);
        staking.stake{value: 2 ether}(PLAN0);

        // pending
        (uint256 principal, uint256 bonus, bool matured) = staking.pendingPayout(bob, 0);
        assertEq(principal, 2 ether);
        assertEq(bonus, calcBonus(2 ether, PLAN0_BPS)); // 0.4 ether
        assertFalse(matured);

        // timeToUnlock ~ 1 day (minus a tiny delta)
        uint256 r = staking.timeToUnlock(bob, 0);
        assertGt(r, 0, "time remaining > 0");
        assertLe(r, PLAN0_DURATION, "time remaining <= duration");

        // After warp, matured is true, and timeToUnlock returns 0
        vm.warp(block.timestamp + PLAN0_DURATION + 1);
        (,, matured) = staking.pendingPayout(bob, 0);
        assertTrue(matured, "should be matured now");
        assertEq(staking.timeToUnlock(bob, 0), 0, "time remaining = 0");

        // positionsOf returns 1 position with withdrawn=false
        EthFixedTermStaking.Position[] memory bpos = staking.positionsOf(bob);
        assertEq(bpos.length, 1);
        assertEq(bpos[0].amount, uint128(2 ether));
        assertEq(bpos[0].withdrawn, false);
    }

    function test_ReceiveTopUp_EmitsRewardsFunded() public {
        // Directly sending ETH to contract should emit RewardsFunded(from, amount)
        vm.expectEmit(true, false, false, true);
        emit RewardsFunded(alice, 1 ether);
        vm.prank(alice);
        (bool ok, ) = address(staking).call{value: 1 ether}("");
        require(ok, "plain send failed");

        assertEq(address(staking).balance, 1 ether);
        assertEq(staking.rewardsPool(), 1 ether);
    }

    // ------------- Admin Withdraw -------------

    function test_AdminWithdrawAny_WorksAndEmits() public {
        // Fund 5 ETH
        vm.prank(owner);
        staking.fundRewards{value: 5 ether}();

        // Withdraw 2 ETH to treasury
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit AdminWithdraw(payable(treasury), 2 ether);
        staking.adminWithdrawAny(payable(treasury), 2 ether);

        assertEq(address(staking).balance, 3 ether);
        assertEq(treasury.balance, 2 ether);
    }

    function test_AdminWithdrawAny_RevertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(EthFixedTermStaking.ToZeroAddress.selector);
        staking.adminWithdrawAny(payable(address(0)), 1 ether);
    }

    // ------------- Edge errors -------------

    function test_Withdraw_RevertBadPositionId() public {
        vm.prank(owner);
        staking.unpause();

        // no positions for alice yet
        vm.prank(alice);
        vm.expectRevert(EthFixedTermStaking.BadPositionId.selector);
        staking.withdraw(0);
    }

    function test_EmergencyWithdraw_RevertBadPositionId() public {
        vm.prank(owner);
        staking.unpause();

        vm.prank(alice);
        vm.expectRevert(EthFixedTermStaking.BadPositionId.selector);
        staking.emergencyWithdraw(999);
    }
}
