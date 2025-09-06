"use client";

import { motion } from 'framer-motion';

const StatsCard = ({ title, value, description, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-6 rounded-xl text-center hover:scale-105 transition-spring"
    >
      <h3 className="text-2xl font-bold text-primary mb-2">{value}</h3>
      <p className="text-lg font-semibold mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
};

export default StatsCard;
