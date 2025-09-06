"use client";

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Clock, Target, Rocket } from 'lucide-react';
import Link from 'next/link';

const Roadmap = () => {
  const roadmapItems = [
    {
      year: "2024",
      quarter: "Q4",
      title: "Staking Platform Launch",
      description: "Launch of our core ETH staking platform with fixed-term bonuses and secure smart contracts.",
      status: "completed",
      icon: CheckCircle,
      features: [
        "Smart contract deployment",
        "Fixed-term staking plans",
        "Security audits",
        "User dashboard"
      ]
    },
    {
      year: "2025",
      quarter: "Q1",
      title: "Token Development",
      description: "Development and launch of our native utility token with governance features.",
      status: "in-progress",
      icon: Target,
      features: [
        "Token economics design",
        "Governance mechanism",
        "Token distribution",
        "Staking rewards integration"
      ]
    },
    {
      year: "2027",
      quarter: "Q2",
      title: "Advanced Token Features",
      description: "Implementation of advanced token features including yield farming and liquidity pools.",
      status: "planned",
      icon: Rocket,
      features: [
        "Yield farming protocols",
        "Liquidity pools",
        "Cross-chain integration",
        "Advanced DeFi features"
      ]
    },
    {
      year: "2028",
      quarter: "Q1",
      title: "Airdrop DApp Launch",
      description: "Launch of our decentralized airdrop platform for community rewards and token distribution.",
      status: "planned",
      icon: Rocket,
      features: [
        "Airdrop smart contracts",
        "Community rewards system",
        "Decentralized distribution",
        "Multi-token support"
      ]
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'in-progress':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'planned':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'planned':
        return 'Planned';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Project Roadmap
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto">
            Our journey to revolutionize decentralized staking and build the future of DeFi
          </p>
        </motion.div>

        {/* Roadmap Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 transform md:-translate-x-0.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-blue-500 to-purple-500"></div>

          {roadmapItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className={`relative mb-16 flex items-center ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
            >
              {/* Timeline Dot */}
              <div className="absolute left-6 md:left-1/2 transform md:-translate-x-1/2 w-4 h-4 bg-primary rounded-full border-4 border-background z-10"></div>

              {/* Content Card */}
              <div className={`ml-16 md:ml-0 w-full md:w-5/12 ${
                index % 2 === 0 ? 'md:pr-8' : 'md:pl-8'
              }`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-card p-8 rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {item.year} • {item.quarter}
                        </span>
                        <h3 className="text-2xl font-bold">{item.title}</h3>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground mb-6 text-lg">
                    {item.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3">Key Features:</h4>
                    <ul className="space-y-2">
                      {item.features.map((feature, featureIndex) => (
                        <motion.li
                          key={featureIndex}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: featureIndex * 0.1 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <span className="text-muted-foreground">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </div>

              {/* Arrow */}
              {index < roadmapItems.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className={`hidden md:block absolute left-1/2 transform -translate-x-1/2 ${
                    index % 2 === 0 ? 'top-full mt-8' : 'top-full mt-8'
                  }`}
                >
                  <ArrowRight className="w-6 h-6 text-primary rotate-90" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mt-20"
        >
          <div className="glass-card p-8 rounded-xl max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Join Our Journey</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Be part of the future of decentralized staking. Stake your ETH today and help us build the next generation of DeFi protocols.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="gradient-primary px-8 py-3 rounded-lg text-white font-semibold transition-all duration-300 hover:shadow-lg"
                >
                  Start Staking Now
                </motion.button>
              </Link>
              <Link href="/about">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass-card px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg"
                >
                  Learn More
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Roadmap;
