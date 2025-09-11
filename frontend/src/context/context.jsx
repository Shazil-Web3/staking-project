'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import stakingData from './staking.json';

// Create the context
const StakingContext = createContext();

// Contract address - you'll need to update this with your deployed contract address
const CONTRACT_ADDRESS = "0x401c9A6320A77e39FBb38ed00E6C6Db6E38031a7"; // TODO: Replace with actual deployed contract address

// Staking plans configuration based on the contract
const STAKING_PLANS = [
  {
    id: 0,
    name: "1 Day Plan",
    duration: 86400, // 1 day in seconds
    bonusPercentage: 20,
    bonusBps: 2000
  },
  {
    id: 1,
    name: "2 Day Plan", 
    duration: 172800, // 2 days in seconds
    bonusPercentage: 50,
    bonusBps: 5000
  },
  {
    id: 2,
    name: "3 Day Plan",
    duration: 259200, // 3 days in seconds
    bonusPercentage: 100,
    bonusBps: 10000
  }
];

// Provider component
export const StakingProvider = ({ children }) => {
  // State management
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userPositions, setUserPositions] = useState([]);
  const [contractData, setContractData] = useState({
    totalPrincipalLocked: '0',
    totalBonusLiability: '0',
    rewardsPool: '0',
    isPaused: false
  });

  // Initialize provider and contract
  useEffect(() => {
    const initializeProvider = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(web3Provider);
          
          // Check if already connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const signer = await web3Provider.getSigner();
            const address = await signer.getAddress();
            setAccount(address);
            setSigner(signer);
            setIsConnected(true);
            
            // Initialize contract
            const stakingContract = new ethers.Contract(CONTRACT_ADDRESS, stakingData.abi, signer);
            setContract(stakingContract);
          }
        } catch (error) {
          console.error('Error initializing provider:', error);
        }
      }
    };

    initializeProvider();
  }, []);

  // Connect wallet function
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        setIsLoading(true);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(web3Provider);
        setSigner(signer);
        setAccount(address);
        setIsConnected(true);
        
        // Initialize contract
        const stakingContract = new ethers.Contract(CONTRACT_ADDRESS, stakingData.abi, signer);
        setContract(stakingContract);
        
        return address;
      } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    } else {
      throw new Error('MetaMask is not installed');
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setIsConnected(false);
    setUserPositions([]);
  };

  // Fetch user positions
  const fetchUserPositions = async () => {
    if (!contract || !account) return;
    
    try {
      setIsLoading(true);
      const positions = await contract.positionsOf(account);
      
      // Get current block timestamp for accurate maturity calculation
      const currentBlock = await provider.getBlock('latest');
      const currentTimestamp = currentBlock.timestamp;
      
      // Format positions data
      const formattedPositions = positions.map((position, index) => ({
        id: index,
        amount: ethers.formatEther(position.amount),
        bonusWei: ethers.formatEther(position.bonusWei),
        start: Number(position.start),
        unlock: Number(position.unlock),
        planId: Number(position.planId),
        withdrawn: position.withdrawn,
        isMatured: currentTimestamp >= Number(position.unlock)
      }));
      
      setUserPositions(formattedPositions);
      return formattedPositions;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch contract data
  const fetchContractData = async () => {
    if (!contract) return;
    
    try {
      const [totalPrincipal, totalBonus, rewardsPool, isPaused] = await Promise.all([
        contract.totalPrincipalLocked(),
        contract.totalBonusLiability(),
        contract.rewardsPool(),
        contract.paused()
      ]);
      
      const data = {
        totalPrincipalLocked: ethers.formatEther(totalPrincipal),
        totalBonusLiability: ethers.formatEther(totalBonus),
        rewardsPool: ethers.formatEther(rewardsPool),
        isPaused
      };
      
      setContractData(data);
      return data;
    } catch (error) {
      console.error('Error fetching contract data:', error);
      throw error;
    }
  };

  // Stake function
  const stake = async (planId, amount) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      setIsLoading(true);
      const amountWei = ethers.parseEther(amount.toString());
      
      const tx = await contract.stake(planId, { value: amountWei });
      await tx.wait();
      
      // Refresh data after successful stake
      await Promise.all([fetchUserPositions(), fetchContractData()]);
      
      return tx;
    } catch (error) {
      console.error('Error staking:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw function
  const withdraw = async (positionId) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      setIsLoading(true);
      const tx = await contract.withdraw(positionId);
      await tx.wait();
      
      // Refresh data after successful withdrawal
      await Promise.all([fetchUserPositions(), fetchContractData()]);
      
      return tx;
    } catch (error) {
      console.error('Error withdrawing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Emergency withdraw function
  const emergencyWithdraw = async (positionId) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      setIsLoading(true);
      const tx = await contract.emergencyWithdraw(positionId);
      await tx.wait();
      
      // Refresh data after successful emergency withdrawal
      await Promise.all([fetchUserPositions(), fetchContractData()]);
      
      return tx;
    } catch (error) {
      console.error('Error emergency withdrawing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get pending payout for a position
  const getPendingPayout = async (positionId) => {
    if (!contract || !account) throw new Error('Contract or account not available');
    
    try {
      const [principal, bonus, matured] = await contract.pendingPayout(account, positionId);
      
      return {
        principal: ethers.formatEther(principal),
        bonus: ethers.formatEther(bonus),
        matured
      };
    } catch (error) {
      console.error('Error getting pending payout:', error);
      throw error;
    }
  };

  // Get time to unlock for a position
  const getTimeToUnlock = async (positionId) => {
    if (!contract || !account) throw new Error('Contract or account not available');
    
    try {
      const timeToUnlock = await contract.timeToUnlock(account, positionId);
      return Number(timeToUnlock);
    } catch (error) {
      console.error('Error getting time to unlock:', error);
      throw error;
    }
  };

  // Get plan information
  const getPlanInfo = async (planId) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      const [duration, bonusBps] = await contract.planInfo(planId);
      
      return {
        duration: Number(duration),
        bonusBps: Number(bonusBps),
        bonusPercentage: Number(bonusBps) / 100
      };
    } catch (error) {
      console.error('Error getting plan info:', error);
      throw error;
    }
  };

  // Listen to account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          // Account changed, reconnect
          connectWallet();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [account]);

  // Auto-refresh data periodically
  useEffect(() => {
    if (contract && account) {
      // Initial fetch
      fetchUserPositions();
      fetchContractData();
      
      // Set up periodic refresh
      const interval = setInterval(() => {
        fetchUserPositions();
        fetchContractData();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [contract, account]);

  // Context value
  const value = {
    // State
    account,
    provider,
    signer,
    contract,
    isConnected,
    isLoading,
    userPositions,
    contractData,
    stakingPlans: STAKING_PLANS,
    
    // Functions
    connectWallet,
    disconnectWallet,
    fetchUserPositions,
    fetchContractData,
    stake,
    withdraw,
    emergencyWithdraw,
    getPendingPayout,
    getTimeToUnlock,
    getPlanInfo
  };

  return (
    <StakingContext.Provider value={value}>
      {children}
    </StakingContext.Provider>
  );
};

// Custom hook to use the staking context
export const useStaking = () => {
  const context = useContext(StakingContext);
  if (!context) {
    throw new Error('useStaking must be used within a StakingProvider');
  }
  return context;
};

export default StakingContext;
