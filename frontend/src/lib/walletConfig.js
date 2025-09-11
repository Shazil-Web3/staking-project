import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'ETH Staking Platform',
  projectId: 'YOUR_PROJECT_ID', // You can get this from https://cloud.walletconnect.com/
  chains: [sepolia], // Only Sepolia testnet
  ssr: false, // Disable SSR for client-side rendering
});

// Sepolia testnet configuration
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
export const SEPOLIA_BLOCK_EXPLORER = 'https://sepolia.etherscan.io';
