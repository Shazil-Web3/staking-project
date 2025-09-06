"use client";

import Link from 'next/link';
import { Button } from './ui/button';

export default function Navigation() {
  return (
    <nav className="glass-card border-b border-border/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-foreground">
              Staking Platform
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/landing">
              <Button variant="ghost">Landing</Button>
            </Link>
            <Link href="/index">
              <Button variant="ghost">Index</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
