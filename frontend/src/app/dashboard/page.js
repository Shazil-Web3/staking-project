"use client";

import Dashboard from '../Dashboard';
import { WalletProvider } from '@/components/WalletProvider';

export default function DashboardPage() {
  return (
    <WalletProvider>
      <Dashboard />
    </WalletProvider>
  );
}
