"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wallet, Clock, TrendingUp, Plus } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { SEPOLIA_CHAIN_ID } from '@/lib/walletConfig';
import { useStaking } from '@/context/context';
import { 
  getPositions, 
  getUserStats, 
  getActivities, 
  getUpcomingMaturities,
  createPosition,
  updatePositionStatus,
  updatePositionStatusByIndex,
  logWalletConnected,
  logWalletDisconnected,
  subscribeToPositions,
  subscribeToActivities,
  PLANS,
  POSITION_STATUS
} from '@/lib/supabase';

const Dashboard = () => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [positions, setPositions] = useState([]);
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);
  const [upcomingMaturities, setUpcomingMaturities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();

  // Smart contract integration
  const {
    userPositions: contractPositions,
    contractData,
    stakingPlans,
    stake: contractStake,
    withdraw: contractWithdraw,
    emergencyWithdraw: contractEmergencyWithdraw,
    isLoading: contractLoading
  } = useStaking();

  // Check if user is on Sepolia testnet
  const isOnSepolia = chain?.id === SEPOLIA_CHAIN_ID;
  const isWrongNetwork = isConnected && !isOnSepolia;

  // Auto-connect wallet when Dashboard loads
  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      // Try to connect with the first available connector (usually MetaMask)
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    }
  }, [isConnected, connectors, connect]);

  // Fetch data when wallet connects
  useEffect(() => {
    if (address && isOnSepolia) {
      fetchDashboardData();
      logWalletConnected(address);
    }
  }, [address, isOnSepolia]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!address) return;

    const positionsSubscription = subscribeToPositions(address, (payload) => {
      console.log('Position update:', payload);
      fetchDashboardData(); // Refresh data on any change
    });

    const activitiesSubscription = subscribeToActivities(address, (payload) => {
      console.log('Activity update:', payload);
      fetchActivities();
    });

    return () => {
      positionsSubscription.unsubscribe();
      activitiesSubscription.unsubscribe();
    };
  }, [address]);

  const fetchDashboardData = async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [positionsData, statsData, activitiesData, maturitiesData] = await Promise.all([
        getPositions(address),
        getUserStats(address),
        getActivities(address, 10),
        getUpcomingMaturities(address)
      ]);

      setPositions(positionsData);
      setStats(statsData);
      setActivities(activitiesData);
      setUpcomingMaturities(maturitiesData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!address) return;
    
    try {
      const activitiesData = await getActivities(address, 10);
      setActivities(activitiesData);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  // Handle network switching to Sepolia
  const handleSwitchToSepolia = () => {
    if (switchChain) {
      switchChain({ chainId: SEPOLIA_CHAIN_ID });
    }
  };

  const plans = [
    { value: '0', label: 'Plan A - +20% Bonus (1 day)', bonus: 20, days: 1 },
    { value: '1', label: 'Plan B - +50% Bonus (2 days)', bonus: 50, days: 2 },
    { value: '2', label: 'Plan C - +100% Bonus (3 days)', bonus: 100, days: 3 }
  ];

  const calculateReward = () => {
    if (!stakeAmount || !selectedPlan) return '0.000000';
    const amount = parseFloat(stakeAmount);
    const plan = plans.find(p => p.value === selectedPlan);
    if (!plan) return '0.000000';
    
    const totalReturn = amount * (1 + plan.bonus / 100);
    return totalReturn.toFixed(6);
  };

  const handleStake = async () => {
    if (!address || !selectedPlan || !stakeAmount) return;
    
    setLoading(true);
    setError(null);
    setTxHash(null);
    
    try {
      const planId = parseInt(selectedPlan);
      const amount = parseFloat(stakeAmount);
      
      console.log('Staking with:', { planId, amount, selectedPlan });
      
      // Find the plan to get bonus and days
      const plan = plans.find(p => p.value === selectedPlan);
      console.log('Found plan:', plan);
      
      if (!plan) {
        throw new Error('Invalid plan selected');
      }
      
      // Call smart contract stake function
      console.log('Calling contractStake...');
      const tx = await contractStake(planId, amount);
      console.log('Transaction successful:', tx);
      setTxHash(tx.hash);
      
      // Also create position in Supabase for UI tracking
      const principalAmount = amount;
      const bonusAmount = principalAmount * (plan.bonus / 100);
      const unlockDate = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000);
      
      console.log('Creating Supabase position...');
      await createPosition(
        address,
        planId,
        principalAmount,
        bonusAmount,
        unlockDate.toISOString(),
        positions.length
      );
      
      // Reset form
      setSelectedPlan('');
      setStakeAmount('');
      
      // Refresh data
      await fetchDashboardData();
      
    } catch (err) {
      console.error('Error creating stake:', err);
      setError(err.message || 'Failed to create stake');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (positionIndex) => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    setTxHash(null);
    
    try {
      // Call smart contract withdraw function
      const tx = await contractWithdraw(positionIndex);
      setTxHash(tx.hash);
      
      // Also update position in Supabase for UI tracking
      await updatePositionStatusByIndex(address, positionIndex, POSITION_STATUS.WITHDRAWN);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error withdrawing position:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyWithdraw = async (positionIndex) => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    setTxHash(null);
    
    try {
      // Call smart contract emergency withdraw function
      const tx = await contractEmergencyWithdraw(positionIndex);
      setTxHash(tx.hash);
      
      // Also update position in Supabase for UI tracking
      await updatePositionStatusByIndex(address, positionIndex, POSITION_STATUS.WITHDRAWN);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error emergency withdrawing position:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (unlockDate) => {
    const now = new Date();
    const unlock = new Date(unlockDate);
    const diff = unlock - now;
    
    if (diff <= 0) return 'Matured';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (num < 0.001) {
      return `${num.toFixed(6)} ETH`;
    }
    if (num < 0.01) {
      return `${num.toFixed(6)} ETH`;
    }
    if (num < 1) {
      return `${num.toFixed(6)} ETH`;
    }
    return `${num.toFixed(6)} ETH`;
  };

  return (
    <div className="container mx-auto px-6 py-12 space-y-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Manage your staking positions and earn rewards</p>
        </div>
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;
            const isOnCorrectNetwork = connected && chain?.id === SEPOLIA_CHAIN_ID;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <Button 
                        variant="glass" 
                        size="lg" 
                        onClick={openConnectModal}
                        className="wallet-connect-glow relative border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 transition-all duration-300"
                      >
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-500/20 to-transparent"></div>
                        <Wallet className="mr-2 w-5 h-5 relative z-10" />
                        <span className="relative z-10 font-semibold">Connect Wallet</span>
                      </Button>
                    );
                  }

                  if (!isOnCorrectNetwork) {
                    return (
                      <Button 
                        variant="glass" 
                        size="lg" 
                        onClick={handleSwitchToSepolia}
                        className="border-2 border-orange-500 bg-orange-500/10 hover:bg-orange-500/20 transition-all duration-300"
                      >
                        <AlertTriangle className="mr-2 w-5 h-5" />
                        Switch to Sepolia
                      </Button>
                    );
                  }

                  return (
                    <Button 
                      variant="glass" 
                      size="lg" 
                      onClick={openAccountModal}
                      className="border-2 border-green-400/60 bg-green-500/5 hover:bg-green-500/10 transition-all duration-300 hover:border-green-400/80 hover:shadow-lg hover:shadow-green-400/20"
                    >
                      <Wallet className="mr-2 w-5 h-5" />
                      <span className="font-medium">{account.displayName}</span>
                    </Button>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-xl border-l-4 border-l-red-500 bg-red-500/5"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-semibold text-red-600">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Success Display */}
      {txHash && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-xl border-l-4 border-l-green-500 bg-green-500/5"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-semibold text-green-600">Transaction Successful</p>
              <p className="text-sm text-muted-foreground">
                Transaction Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Status Callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className={`glass-card p-4 rounded-xl border-l-4 ${
          isConnected && isOnSepolia
            ? 'border-l-green-500 bg-green-500/5' 
            : isWrongNetwork
            ? 'border-l-orange-500 bg-orange-500/5'
            : 'border-l-yellow-500 bg-yellow-500/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <TrendingUp className={`w-5 h-5 ${
            isConnected && isOnSepolia 
              ? 'text-green-500' 
              : isWrongNetwork 
              ? 'text-orange-500' 
              : 'text-yellow-500'
          }`} />
          <div>
            <p className={`font-semibold ${
              isConnected && isOnSepolia 
                ? 'text-green-600' 
                : isWrongNetwork 
                ? 'text-orange-600' 
                : 'text-yellow-600'
            }`}>
              {isConnected && isOnSepolia 
                ? 'Wallet Connected to Sepolia' 
                : isWrongNetwork 
                ? 'Wrong Network - Switch to Sepolia'
                : 'Wallet Not Connected'
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {isConnected && isOnSepolia 
                ? `Connected to ${address?.slice(0, 6)}...${address?.slice(-4)} on Sepolia testnet. Platform is operational.`
                : isWrongNetwork 
                ? `You're connected to ${chain?.name || 'unknown network'}. Please switch to Sepolia testnet to use this platform.`
                : 'Please connect your wallet to Sepolia testnet to access staking features and manage your positions.'
              }
            </p>
          </div>
        </div>
      </motion.div>


      <div className="grid lg:grid-cols-3 gap-12">
        {/* Stake Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-1"
        >
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Stake
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Plan</label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan} disabled={!isConnected || !isOnSepolia}>
                  <SelectTrigger className="glass-card border-0">
                    <SelectValue placeholder={
                      !isConnected 
                        ? "Connect wallet first" 
                        : !isOnSepolia 
                        ? "Switch to Sepolia first" 
                        : "Choose a staking plan"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.value} value={plan.value}>
                        {plan.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Amount to Stake (ETH)</label>
                <Input
                  type="number"
                  step="0.00000001"
                  placeholder={
                    !isConnected 
                      ? "Connect wallet first" 
                      : !isOnSepolia 
                      ? "Switch to Sepolia first" 
                      : "Enter ETH amount"
                  }
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="glass-card border-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  disabled={!isConnected || !isOnSepolia}
                />
              </div>

              {selectedPlan && stakeAmount && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="glass-card p-4 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <h4 className="font-semibold text-primary mb-2">Return Preview</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll receive <span className="font-semibold text-primary">{calculateReward()} ETH</span> at maturity
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reminder: Withdrawing before maturity returns only your principal.
                  </p>
                </motion.div>
              )}

              <Button 
                variant="hero" 
                className="w-full" 
                size="lg"
                disabled={!isConnected || !isOnSepolia || !selectedPlan || !stakeAmount || loading}
                onClick={handleStake}
              >
                {loading 
                  ? 'Creating Stake...' 
                  : !isConnected 
                  ? 'Connect Wallet to Stake' 
                  : !isOnSepolia 
                  ? 'Switch to Sepolia to Stake' 
                  : 'Stake Tokens'
                }
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Positions Table */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                My Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Plan</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Bonus %</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Unlock Date</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Countdown</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-muted-foreground">
                          Loading positions...
                        </td>
                      </tr>
                    ) : positions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-muted-foreground">
                          No positions found. Create your first stake above!
                        </td>
                      </tr>
                    ) : (
                      positions.map((position, index) => (
                        <motion.tr
                          key={position.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="border-b border-border/20 hover:bg-[hsl(var(--glass-bg))]/50 transition-colors"
                        >
                          <td className="py-4 px-2">#{position.position_index + 1}</td>
                          <td className="py-4 px-2">
                            <Badge variant="secondary">{PLANS[position.plan_id]?.name || `Plan ${position.plan_id}`}</Badge>
                          </td>
                          <td className="py-4 px-2 font-medium">{formatAmount(position.principal_amount)}</td>
                          <td className="py-4 px-2 text-primary font-medium">+{PLANS[position.plan_id]?.bonusPercent || 0}%</td>
                          <td className="py-4 px-2">{new Date(position.unlock_date).toLocaleDateString()}</td>
                          <td className="py-4 px-2">{formatTimeRemaining(position.unlock_date)}</td>
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                position.status === POSITION_STATUS.MATURED 
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : position.status === POSITION_STATUS.WITHDRAWN
                                  ? "bg-gray-500/10 text-gray-600 border-gray-500/20" 
                                  : "bg-green-500/10 text-green-600 border-green-500/20"
                              }>
                                {position.status}
                              </Badge>
                              {position.status === POSITION_STATUS.MATURED && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleWithdraw(position.position_index)}
                                  disabled={loading}
                                  className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
                                >
                                  Withdraw
                                </Button>
                              )}
                              {position.status === POSITION_STATUS.ACTIVE && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEmergencyWithdraw(position.position_index)}
                                  disabled={loading}
                                  className="bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30"
                                >
                                  Emergency
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Statistics Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {loading ? '...' : `${parseFloat(stats.total_staked || 0).toFixed(6)} ETH`}
            </div>
            <p className="text-sm text-muted-foreground">Total Staked</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {loading ? '...' : `${parseFloat(stats.total_returns || 0).toFixed(6)} ETH`}
            </div>
            <p className="text-sm text-muted-foreground">Total Returns</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <div className="text-3xl font-bold text-blue-500 mb-2">
              {loading ? '...' : stats.active_positions || 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Positions</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">
              {loading ? '...' : `${parseFloat(stats.active_balance || 0).toFixed(6)} ETH`}
            </div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity & Maturities Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="text-center pt-12 pb-20"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Activity & Maturities</h2>
        <p className="text-muted-foreground text-lg">Track your recent activities and upcoming position maturities</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="grid lg:grid-cols-2 gap-12"
      >
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-4">
                  Loading activities...
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No recent activity
                </div>
              ) : (
                activities.map((activity, index) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">{activity.event_type.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {activity.metadata?.principal_amount ? formatAmount(activity.metadata.principal_amount) : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming Maturities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-4">
                  Loading maturities...
                </div>
              ) : upcomingMaturities.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No upcoming maturities
                </div>
              ) : (
                upcomingMaturities.map((maturity, index) => (
                  <div key={maturity.position_id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div>
                      <div className="font-medium">Position #{maturity.position_id + 1}</div>
                      <div className="text-sm text-muted-foreground">
                        {PLANS[maturity.plan_id]?.name || `Plan ${maturity.plan_id}`} - {formatAmount(maturity.principal_amount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">
                        {maturity.remaining_time > 0 ? formatTimeRemaining(maturity.unlock_date) : 'Matured'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(maturity.unlock_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Platform Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="text-center pt-12 pb-20"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Platform Information</h2>
        <p className="text-muted-foreground text-lg">Learn more about our security features, staking benefits, and support resources</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <Card className="glass-card border-0 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
          <CardHeader>
            <CardTitle className="text-lg">Security Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Multi-signature wallet protection</li>
              <li>• Smart contract audits by CertiK</li>
              <li>• Emergency pause functionality</li>
              <li>• Time-locked upgrades</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
          <CardHeader>
            <CardTitle className="text-lg">Staking Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Compound interest rewards</li>
              <li>• No minimum staking amount</li>
              <li>• Instant reward calculations</li>
              <li>• Flexible staking periods</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
          <CardHeader>
            <CardTitle className="text-lg">Support & Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• 24/7 customer support</li>
              <li>• Comprehensive documentation</li>
              <li>• Community Discord server</li>
              <li>• Regular platform updates</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;