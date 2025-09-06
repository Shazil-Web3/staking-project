"use client";

import { motion } from 'framer-motion';
import { Button } from './button';

const PlanCard = ({ title, description, percentage, duration, example, popular = false, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card p-6 rounded-xl hover:scale-105 transition-spring relative ${
        popular ? 'ring-2 ring-primary' : ''
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="gradient-primary px-4 py-1 rounded-full text-xs font-semibold text-white">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        <div className="mb-4">
          <span className="text-3xl font-bold text-primary">{percentage}</span>
          <span className="text-muted-foreground ml-1">Bonus</span>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{duration}</p>
        {example && (
          <p className="text-xs text-primary font-medium">{example}</p>
        )}
      </div>
      
      <Button 
        variant={popular ? "hero" : "glass"} 
        className="w-full"
      >
        Select Plan
      </Button>
    </motion.div>
  );
};

export default PlanCard;
