import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Plan configurations matching the smart contract
export const PLANS = {
  0: { name: 'Plan A', duration: 1, bonusPercent: 20, bonusBps: 2000 },
  1: { name: 'Plan B', duration: 2, bonusPercent: 50, bonusBps: 5000 },
  2: { name: 'Plan C', duration: 3, bonusPercent: 100, bonusBps: 10000 }
}

// Event types for activity logging
export const EVENT_TYPES = {
  WALLET_CONNECTED: 'walletConnected',
  WALLET_DISCONNECTED: 'walletDisconnected',
  STAKE_ADDED: 'stakeAdded',
  POSITION_MATURED: 'positionMatured',
  REWARD_CLAIMED: 'rewardClaimed',
  EMERGENCY_WITHDRAWN: 'emergencyWithdrawn'
}

// Position statuses
export const POSITION_STATUS = {
  ACTIVE: 'active',
  MATURED: 'matured',
  WITHDRAWN: 'withdrawn'
}

// API Functions

/**
 * Log wallet connection activity
 */
export const logWalletConnected = async (walletAddress) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  
  const { data, error } = await supabase
    .from('activities')
    .insert({
      wallet_address: walletAddress,
      event_type: EVENT_TYPES.WALLET_CONNECTED,
      metadata: { connected_at: new Date().toISOString() }
    })
    
  if (error) throw error
  return data
}

/**
 * Log wallet disconnection activity
 */
export const logWalletDisconnected = async (walletAddress) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  
  const { data, error } = await supabase
    .from('activities')
    .insert({
      wallet_address: walletAddress,
      event_type: EVENT_TYPES.WALLET_DISCONNECTED,
      metadata: { disconnected_at: new Date().toISOString() }
    })
    
  if (error) throw error
  return data
}

/**
 * Create a new staking position
 */
export const createPosition = async (walletAddress, planId, principalAmount, bonusAmount, unlockDate, positionIndex) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  if (planId < 0 || planId > 2) throw new Error('Invalid plan ID')
  if (principalAmount <= 0) throw new Error('Principal amount must be positive')
  if (bonusAmount < 0) throw new Error('Bonus amount cannot be negative')
  if (!unlockDate) throw new Error('Unlock date is required')
  
  const { data, error } = await supabase
    .from('positions')
    .insert({
      wallet_address: walletAddress,
      plan_id: planId,
      principal_amount: principalAmount.toString(),
      bonus_amount: bonusAmount.toString(),
      unlock_date: unlockDate,
      status: POSITION_STATUS.ACTIVE,
      position_index: positionIndex
    })
    .select()
    .single()
    
  if (error) throw error
  return data
}

/**
 * Update position status (e.g., mark as withdrawn)
 */
export const updatePositionStatus = async (walletAddress, positionId, newStatus) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  if (!positionId) throw new Error('Position ID is required')
  if (!Object.values(POSITION_STATUS).includes(newStatus)) {
    throw new Error('Invalid status')
  }
  
  const { data, error } = await supabase
    .from('positions')
    .update({ status: newStatus })
    .eq('id', positionId)
    .eq('wallet_address', walletAddress)
    .select()
    .single()
    
  if (error) throw error
  return data
}

/**
 * Update position status by position index (for smart contract integration)
 */
export const updatePositionStatusByIndex = async (walletAddress, positionIndex, newStatus) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  if (positionIndex === undefined || positionIndex === null) throw new Error('Position index is required')
  if (!Object.values(POSITION_STATUS).includes(newStatus)) {
    throw new Error('Invalid status')
  }
  
  const { data, error } = await supabase
    .from('positions')
    .update({ status: newStatus })
    .eq('position_index', positionIndex)
    .eq('wallet_address', walletAddress)
    .select()
    .single()
    
  if (error) throw error
  return data
}

/**
 * Get all positions for a wallet
 */
export const getPositions = async (walletAddress) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return data || []
}

/**
 * Get user statistics
 */
export const getUserStats = async (walletAddress) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  
  try {
    // Try the database function first
    const { data, error } = await supabase
      .rpc('get_user_stats', { wallet_addr: walletAddress })
      
    if (error) {
      console.warn('Database function not available, calculating stats manually:', error.message)
      // Fallback to manual calculation
      return await calculateUserStatsManually(walletAddress)
    }
    
    return data
  } catch (err) {
    console.warn('Error with database function, calculating stats manually:', err.message)
    // Fallback to manual calculation
    return await calculateUserStatsManually(walletAddress)
  }
}

/**
 * Manual calculation of user stats (fallback)
 */
const calculateUserStatsManually = async (walletAddress) => {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('wallet_address', walletAddress)
    
  if (error) throw error
  
  let totalStaked = 0
  let totalReturns = 0
  let activePositions = 0
  let activeBalance = 0
  
  positions.forEach(position => {
    const principal = parseFloat(position.principal_amount)
    const bonus = parseFloat(position.bonus_amount)
    
    if (position.status === 'active') {
      totalStaked += principal
      activePositions++
      activeBalance += principal
    } else if (position.status === 'matured') {
      totalReturns += principal + bonus
      activeBalance += principal + bonus
    } else if (position.status === 'withdrawn') {
      totalReturns += principal + bonus
    }
  })
  
  return {
    total_staked: totalStaked.toString(),
    total_returns: totalReturns.toString(),
    active_positions: activePositions,
    active_balance: activeBalance.toString()
  }
}

/**
 * Get recent activities for a wallet
 */
export const getActivities = async (walletAddress, limit = 10) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(limit)
    
  if (error) throw error
  return data || []
}

/**
 * Get upcoming maturities for a wallet
 */
export const getUpcomingMaturities = async (walletAddress) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  
  try {
    // Try the database function first
    const { data, error } = await supabase
      .rpc('get_upcoming_maturities', { wallet_addr: walletAddress })
      
    if (error) {
      console.warn('Database function not available, calculating maturities manually:', error.message)
      // Fallback to manual calculation
      return await calculateUpcomingMaturitiesManually(walletAddress)
    }
    
    return data || []
  } catch (err) {
    console.warn('Error with database function, calculating maturities manually:', err.message)
    // Fallback to manual calculation
    return await calculateUpcomingMaturitiesManually(walletAddress)
  }
}

/**
 * Manual calculation of upcoming maturities (fallback)
 */
const calculateUpcomingMaturitiesManually = async (walletAddress) => {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .eq('status', 'active')
    .gt('unlock_date', new Date().toISOString())
    .order('unlock_date', { ascending: true })
    
  if (error) throw error
  
  return positions.map(position => ({
    position_id: position.position_index,
    unlock_date: position.unlock_date,
    remaining_time: Math.max(0, Math.floor((new Date(position.unlock_date) - new Date()) / 1000)),
    plan_id: position.plan_id,
    principal_amount: position.principal_amount,
    bonus_amount: position.bonus_amount
  }))
}

/**
 * Subscribe to real-time position updates
 */
export const subscribeToPositions = (walletAddress, callback) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  
  return supabase
    .channel('positions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'positions',
        filter: `wallet_address=eq.${walletAddress}`
      },
      callback
    )
    .subscribe()
}

/**
 * Subscribe to real-time activity updates
 */
export const subscribeToActivities = (walletAddress, callback) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  
  return supabase
    .channel('activities')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `wallet_address=eq.${walletAddress}`
      },
      callback
    )
    .subscribe()
}
