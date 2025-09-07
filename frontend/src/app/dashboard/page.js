"use client";

import Dashboard from '../Dashboard';
import { StakingProvider } from '@/context/context';

export default function DashboardPage() {
  return (
    <StakingProvider>
      <Dashboard />
    </StakingProvider>
  );
}
