"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, Users, Zap, FileText, ExternalLink, CheckCircle } from 'lucide-react';
import FeatureCard from '@/components/ui/FeatureCard';
import Link from 'next/link';

const About = () => {
  const infoCards = [
    {
      icon: Shield,
      title: "Security First",
      description: "Our platform uses audited smart contracts and industry-leading security practices to protect your funds."
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Built by the community, for the community. We believe in transparent governance and user participation."
    },
    {
      icon: Zap,
      title: "High Performance",
      description: "Optimized for speed and efficiency with 99.9% uptime and instant reward calculations."
    }
  ];

  const contractFeatures = [
    "Fully audited smart contracts",
    "Multi-signature wallet security",
    "Transparent reward distribution",
    "Emergency pause functionality",
    "Upgrade-safe architecture"
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
          <h1 className="text-5xl md:text-6xl font-bold mb-6">About StakeVault</h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto">
            We're building the future of decentralized staking with a focus on security, transparency, and user experience. Our mission is to make staking accessible and profitable for everyone.
          </p>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
            <p className="text-muted-foreground text-lg mb-6">
              StakeVault was created to democratize access to high-yield staking opportunities while maintaining the highest standards of security and transparency. We believe that everyone should have access to professional-grade staking infrastructure.
            </p>
            <p className="text-muted-foreground text-lg">
              Our team consists of blockchain experts, security researchers, and DeFi veterans who are passionate about building sustainable and reliable financial products.
            </p>
          </div>
          
          <div className="glass-card p-8 rounded-xl">
            <h3 className="text-2xl font-bold mb-4 text-primary">Why Choose Us?</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>Competitive APY rates</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>Transparent fee structure</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>24/7 customer support</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>Regular security audits</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>User-friendly interface</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
          <p className="text-muted-foreground text-lg">The principles that guide everything we do</p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {infoCards.map((card, index) => (
            <FeatureCard key={index} {...card} delay={index * 0.1} />
          ))}
        </div>
      </section>

      {/* Contract Section */}
      <section className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 rounded-xl"
        >
          <h2 className="text-3xl font-bold mb-6 text-center">Smart Contract at a Glance</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Contract Features</h3>
              <ul className="space-y-3">
                {contractFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center">
              <div className="glass-card p-6 rounded-lg text-center">
                <h4 className="font-semibold mb-2">Contract Address</h4>
                <p className="text-sm text-muted-foreground font-mono mb-4">
                  0x1234...5678 (Placeholder)
                </p>
                <p className="text-xs text-muted-foreground">
                  This is a design placeholder. Actual contract deployment would occur during production.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Support Section */}
      <section className="container mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Need Help?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Our team is here to support you every step of the way
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/roadmap">
              <Button variant="hero" size="lg">
                <FileText className="mr-2 w-5 h-5" />
                Roadmap
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default About;