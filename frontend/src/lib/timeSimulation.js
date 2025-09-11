// Time simulation utilities for development testing
// This file helps you test time-based functionality without waiting real time

import { supabase } from './supabase';

/**
 * Simulate time passage by updating unlock dates in the database
 * This is for development testing only - DO NOT use in production
 */
export const simulateTimePassage = async (walletAddress, hoursToAdvance = 24) => {
  if (!walletAddress) throw new Error('Wallet address is required');
  
  console.log(`🕐 Simulating ${hoursToAdvance} hours of time passage for wallet: ${walletAddress}`);
  
  try {
    // Get all active positions for this wallet
    const { data: positions, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('status', 'active');
    
    if (fetchError) throw fetchError;
    
    if (!positions || positions.length === 0) {
      console.log('No active positions found to simulate time for');
      return;
    }
    
    // Update each position's unlock date
    const updates = positions.map(async (position) => {
      const currentUnlockDate = new Date(position.unlock_date);
      const newUnlockDate = new Date(currentUnlockDate.getTime() - (hoursToAdvance * 60 * 60 * 1000));
      
      const { error: updateError } = await supabase
        .from('positions')
        .update({ 
          unlock_date: newUnlockDate.toISOString(),
          status: newUnlockDate <= new Date() ? 'matured' : 'active'
        })
        .eq('id', position.id);
      
      if (updateError) {
        console.error(`Error updating position ${position.id}:`, updateError);
      } else {
        console.log(`✅ Position ${position.position_index + 1} updated - New unlock date: ${newUnlockDate.toISOString()}`);
      }
    });
    
    await Promise.all(updates);
    console.log('🎉 Time simulation complete! Refresh your dashboard to see changes.');
    
  } catch (error) {
    console.error('Error simulating time passage:', error);
    throw error;
  }
};

/**
 * Reset all positions to their original unlock dates
 * This undoes the time simulation
 */
export const resetTimeSimulation = async (walletAddress) => {
  if (!walletAddress) throw new Error('Wallet address is required');
  
  console.log('🔄 Resetting time simulation for wallet:', walletAddress);
  
  try {
    // Get all positions for this wallet
    const { data: positions, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('wallet_address', walletAddress);
    
    if (fetchError) throw fetchError;
    
    if (!positions || positions.length === 0) {
      console.log('No positions found to reset');
      return;
    }
    
    // Reset each position to its original unlock date based on plan duration
    const updates = positions.map(async (position) => {
      const createdDate = new Date(position.created_at);
      const planDuration = getPlanDuration(position.plan_id);
      const originalUnlockDate = new Date(createdDate.getTime() + (planDuration * 24 * 60 * 60 * 1000));
      
      const { error: updateError } = await supabase
        .from('positions')
        .update({ 
          unlock_date: originalUnlockDate.toISOString(),
          status: originalUnlockDate <= new Date() ? 'matured' : 'active'
        })
        .eq('id', position.id);
      
      if (updateError) {
        console.error(`Error resetting position ${position.id}:`, updateError);
      } else {
        console.log(`✅ Position ${position.position_index + 1} reset - Original unlock date: ${originalUnlockDate.toISOString()}`);
      }
    });
    
    await Promise.all(updates);
    console.log('🎉 Time simulation reset complete!');
    
  } catch (error) {
    console.error('Error resetting time simulation:', error);
    throw error;
  }
};

/**
 * Get plan duration in days based on plan ID
 */
const getPlanDuration = (planId) => {
  const planDurations = {
    0: 1,  // 1 day
    1: 2,  // 2 days
    2: 3   // 3 days
  };
  return planDurations[planId] || 1;
};

/**
 * Make all positions mature instantly (for testing)
 */
export const makeAllPositionsMature = async (walletAddress) => {
  if (!walletAddress) throw new Error('Wallet address is required');
  
  console.log('⚡ Making all positions mature instantly for wallet:', walletAddress);
  
  try {
    const { error } = await supabase
      .from('positions')
      .update({ 
        unlock_date: new Date().toISOString(),
        status: 'matured'
      })
      .eq('wallet_address', walletAddress)
      .eq('status', 'active');
    
    if (error) throw error;
    
    console.log('🎉 All positions are now mature! You can test withdrawal functionality.');
    
  } catch (error) {
    console.error('Error making positions mature:', error);
    throw error;
  }
};

// Development helper - add these to your browser console for easy testing
if (typeof window !== 'undefined') {
  window.devTools = {
    simulateTime: simulateTimePassage,
    resetTime: resetTimeSimulation,
    makeMature: makeAllPositionsMature
  };
  console.log('🛠️ Development tools available: window.devTools');
  console.log('Usage examples:');
  console.log('  window.devTools.simulateTime("0xYourAddress", 24) // Simulate 24 hours');
  console.log('  window.devTools.makeMature("0xYourAddress") // Make all positions mature');
  console.log('  window.devTools.resetTime("0xYourAddress") // Reset to original times');
}
