import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, goerli, polygon, arbitrum, optimism } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Staking Platform',
  projectId: 'YOUR_PROJECT_ID', // You can get this from https://cloud.walletconnect.com/
  chains: [mainnet, sepolia, goerli, polygon, arbitrum, optimism],
  ssr: false, // If your dApp uses server side rendering (SSR)
});
