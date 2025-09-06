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
import { useAccount, useConnect } from 'wagmi';

const Dashboard = () => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

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

  const mockPositions = [
    {
      id: 1,
      plan: 'Plan B',
      amount: '2.5 ETH',
      bonusPercent: '+50%',
      unlockDate: '2024-12-08',
      countdown: '1 day',
      status: 'Active'
    },
    {
      id: 2,
      plan: 'Plan A',
      amount: '1.0 ETH',
      bonusPercent: '+20%',
      unlockDate: '2024-12-06',
      countdown: 'Matured',
      status: 'Matured'
    },
    {
      id: 3,
      plan: 'Plan C',
      amount: '0.5 ETH',
      bonusPercent: '+100%',
      unlockDate: '2024-12-09',
      countdown: '2 days',
      status: 'Active'
    }
  ];

  const plans = [
    { value: 'plan-a', label: 'Plan A - +20% Bonus (1 day)', bonus: 20, days: 1 },
    { value: 'plan-b', label: 'Plan B - +50% Bonus (2 days)', bonus: 50, days: 2 },
    { value: 'plan-c', label: 'Plan C - +100% Bonus (3 days)', bonus: 100, days: 3 }
  ];

  const calculateReward = () => {
    if (!stakeAmount || !selectedPlan) return '0.00';
    const amount = parseFloat(stakeAmount);
    const plan = plans.find(p => p.value === selectedPlan);
    if (!plan) return '0.00';
    
    const totalReturn = amount * (1 + plan.bonus / 100);
    return totalReturn.toFixed(2);
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

                  if (chain.unsupported) {
                    return (
                      <Button 
                        variant="glass" 
                        size="lg" 
                        onClick={openChainModal}
                        className="border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all duration-300"
                      >
                        <AlertTriangle className="mr-2 w-5 h-5" />
                        Wrong network
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

      {/* Status Callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className={`glass-card p-4 rounded-xl border-l-4 ${
          isConnected 
            ? 'border-l-green-500 bg-green-500/5' 
            : 'border-l-yellow-500 bg-yellow-500/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <TrendingUp className={`w-5 h-5 ${isConnected ? 'text-green-500' : 'text-yellow-500'}`} />
          <div>
            <p className={`font-semibold ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
              {isConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isConnected 
                ? `Connected to ${address?.slice(0, 6)}...${address?.slice(-4)}. Platform is operational.`
                : 'Please connect your wallet to access staking features and manage your positions.'
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
                <Select value={selectedPlan} onValueChange={setSelectedPlan} disabled={!isConnected}>
                  <SelectTrigger className="glass-card border-0">
                    <SelectValue placeholder={isConnected ? "Choose a staking plan" : "Connect wallet first"} />
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
                <label className="text-sm font-medium mb-2 block">Amount to Stake</label>
                <Input
                  type="number"
                  placeholder={isConnected ? "Enter ETH amount" : "Connect wallet first"}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="glass-card border-0"
                  disabled={!isConnected}
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
                disabled={!isConnected}
              >
                {isConnected ? 'Stake Tokens' : 'Connect Wallet to Stake'}
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
                    {mockPositions.map((position) => (
                      <motion.tr
                        key={position.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: position.id * 0.1 }}
                        className="border-b border-border/20 hover:bg-[hsl(var(--glass-bg))]/50 transition-colors"
                      >
                        <td className="py-4 px-2">#{position.id}</td>
                        <td className="py-4 px-2">
                          <Badge variant="secondary">{position.plan}</Badge>
                        </td>
                        <td className="py-4 px-2 font-medium">{position.amount}</td>
                        <td className="py-4 px-2 text-primary font-medium">{position.bonusPercent}</td>
                        <td className="py-4 px-2">{position.unlockDate}</td>
                        <td className="py-4 px-2">{position.countdown}</td>
                        <td className="py-4 px-2">
                          <Badge className={
                            position.status === 'Matured' 
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : position.status === 'Withdrawn'
                              ? "bg-gray-500/10 text-gray-600 border-gray-500/20" 
                              : "bg-green-500/10 text-green-600 border-green-500/20"
                          }>
                            {position.status}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))}
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
            <div className="text-3xl font-bold text-primary mb-2">4.2 ETH</div>
            <p className="text-sm text-muted-foreground">Total Staked</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">+56.7%</div>
            <p className="text-sm text-muted-foreground">Total Returns</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <div className="text-3xl font-bold text-blue-500 mb-2">3</div>
            <p className="text-sm text-muted-foreground">Active Positions</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">2.1 ETH</div>
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
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Stake created</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">+0.5 ETH</div>
                  <div className="text-xs text-muted-foreground">2 hours ago</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Reward claimed</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">+0.1 ETH</div>
                  <div className="text-xs text-muted-foreground">1 day ago</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Position matured</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Plan A</div>
                  <div className="text-xs text-muted-foreground">2 days ago</div>
                </div>
              </div>
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
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div>
                  <div className="font-medium">Position #1</div>
                  <div className="text-sm text-muted-foreground">Plan B - 2.5 ETH</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">1 day</div>
                  <div className="text-xs text-muted-foreground">Dec 8, 2024</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div>
                  <div className="font-medium">Position #3</div>
                  <div className="text-sm text-muted-foreground">Plan C - 0.5 ETH</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">2 days</div>
                  <div className="text-xs text-muted-foreground">Dec 9, 2024</div>
                </div>
              </div>
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