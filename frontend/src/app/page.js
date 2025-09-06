"use client";

import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { ArrowRight, Shield, Zap, TrendingUp, Lock, Coins, AlertTriangle, Clock } from 'lucide-react';
import PlanCard from '../components/ui/PlanCard';
import StatsCard from '../components/ui/StatsCard';
import FeatureCard from '../components/ui/FeatureCard';
import FAQ from '../components/ui/FAQ';
import Link from 'next/link';

const Landing = () => {
  const plans = [
    {
      title: "Plan A",
      description: "Quick returns",
      percentage: "+20%",
      duration: "1 day lock period",
      example: "1.00 ETH → 1.20 ETH"
    },
    {
      title: "Plan B",
      description: "Most popular choice",
      percentage: "+50%",
      duration: "2 day lock period",
      popular: true,
      example: "1.00 ETH → 1.50 ETH"
    },
    {
      title: "Plan C",
      description: "Maximum bonus",
      percentage: "+100%",
      duration: "3 day lock period",
      example: "1.00 ETH → 2.00 ETH"
    }
  ];

  const stats = [
    { title: "Active Plans", value: "2,847", description: "Currently staking" },
    { title: "Total Users", value: "15,429", description: "Community members" },
    { title: "Rewards Pool", value: "$2.4M", description: "Total distributed" },
    { title: "Success Rate", value: "99.9%", description: "Uptime guarantee" }
  ];

  const features = [
    {
      icon: Lock,
      title: "Stake",
      description: "Pick a plan and deposit ETH"
    },
    {
      icon: Clock,
      title: "Lock",
      description: "Funds remain locked for the plan's duration"
    },
    {
      icon: Coins,
      title: "Withdraw",
      description: "At maturity, receive your principal + bonus"
    }
  ];

  const faqItems = [
    {
      question: "What do I get at maturity?",
      answer: "Principal plus the fixed plan bonus. For example, staking 1 ETH in Plan A returns 1.20 ETH at maturity."
    },
    {
      question: "What if I withdraw early?",
      answer: "Only your principal is returned, no bonus. Early withdrawal forfeits the fixed bonus entirely."
    },
    {
      question: "Are bonuses APR?",
      answer: "No, they are fixed one-time bonuses paid at maturity. Plan A gives +20%, Plan B gives +50%, and Plan C gives +100%."
    },
    {
      question: "Do payouts depend on anything?",
      answer: "Payouts depend on available funds at withdrawal time. Bonuses are fixed per plan and only paid at maturity."
    }
  ];

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
          Zeyric a ETH Staking Platform
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Simple, predictable bonuses. Stake ETH, earn fixed returns at maturity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button variant="hero" size="lg">
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/roadmap">
              <Button variant="glass" size="lg">
                Roadmap
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Plans Section */}
      <section className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-muted-foreground text-lg">Select the staking plan that matches your investment strategy</p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <PlanCard key={index} {...plan} delay={index * 0.1} />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">Simple steps to start earning rewards</p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} delay={index * 0.1} />
          ))}
        </div>
      </section>

      {/* Warning Callout */}
      <section className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card p-6 rounded-xl border-l-4 border-l-yellow-500 bg-yellow-500/5"
        >
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2 text-yellow-600">Important Notice</h3>
            <p className="text-muted-foreground">
              Bonuses are fixed per plan and only paid at maturity. Early withdraw returns principal only. Payouts depend on available funds at withdrawal time.
            </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Platform Statistics</h2>
          <p className="text-muted-foreground text-lg">Real-time data from our staking platform</p>
        </motion.div>
        
        <div className="grid md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} delay={index * 0.1} />
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-lg">Everything you need to know about staking</p>
        </motion.div>
        
        <div className="max-w-3xl mx-auto">
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
};

export default Landing;