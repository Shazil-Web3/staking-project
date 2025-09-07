-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create positions table
CREATE TABLE IF NOT EXISTS positions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    plan_id INTEGER NOT NULL CHECK (plan_id >= 0 AND plan_id <= 2),
    principal_amount NUMERIC(78, 18) NOT NULL, -- 78 digits for wei precision
    bonus_amount NUMERIC(78, 18) NOT NULL,
    unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'withdrawn')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    position_index INTEGER NOT NULL -- Index in the smart contract array
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('walletConnected', 'walletDisconnected', 'stakeAdded', 'positionMatured', 'rewardClaimed', 'emergencyWithdrawn')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_positions_wallet ON positions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_unlock_date ON positions(unlock_date);
CREATE INDEX IF NOT EXISTS idx_activities_wallet ON activities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for positions table
CREATE TRIGGER update_positions_updated_at 
    BEFORE UPDATE ON positions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update position status based on unlock date
CREATE OR REPLACE FUNCTION update_position_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if position should be marked as matured
    IF NEW.unlock_date <= NOW() AND NEW.status = 'active' THEN
        NEW.status = 'matured';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update status
CREATE TRIGGER update_position_status_trigger
    BEFORE INSERT OR UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_position_status();

-- Create function to log activities
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log stake added
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        INSERT INTO activities (wallet_address, event_type, metadata)
        VALUES (
            NEW.wallet_address,
            'stakeAdded',
            jsonb_build_object(
                'position_id', NEW.id,
                'plan_id', NEW.plan_id,
                'principal_amount', NEW.principal_amount,
                'bonus_amount', NEW.bonus_amount,
                'unlock_date', NEW.unlock_date
            )
        );
    END IF;
    
    -- Log position matured
    IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'matured' THEN
        INSERT INTO activities (wallet_address, event_type, metadata)
        VALUES (
            NEW.wallet_address,
            'positionMatured',
            jsonb_build_object(
                'position_id', NEW.id,
                'plan_id', NEW.plan_id,
                'principal_amount', NEW.principal_amount,
                'bonus_amount', NEW.bonus_amount
            )
        );
    END IF;
    
    -- Log reward claimed
    IF TG_OP = 'UPDATE' AND OLD.status IN ('active', 'matured') AND NEW.status = 'withdrawn' THEN
        INSERT INTO activities (wallet_address, event_type, metadata)
        VALUES (
            NEW.wallet_address,
            'rewardClaimed',
            jsonb_build_object(
                'position_id', NEW.id,
                'plan_id', NEW.plan_id,
                'principal_amount', NEW.principal_amount,
                'bonus_amount', NEW.bonus_amount,
                'total_amount', NEW.principal_amount + NEW.bonus_amount
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for activity logging
CREATE TRIGGER log_position_activities
    AFTER INSERT OR UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION log_activity();

-- Enable Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for positions table
CREATE POLICY "Users can view their own positions" ON positions
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert their own positions" ON positions
    FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can update their own positions" ON positions
    FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Create RLS policies for activities table
CREATE POLICY "Users can view their own activities" ON activities
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert their own activities" ON activities
    FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Create a function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(wallet_addr TEXT)
RETURNS JSON AS $$
DECLARE
    total_staked NUMERIC(78, 18);
    total_returns NUMERIC(78, 18);
    active_positions INTEGER;
    active_balance NUMERIC(78, 18);
    result JSON;
BEGIN
    -- Calculate total staked (sum of all active positions' principal)
    SELECT COALESCE(SUM(principal_amount), 0) INTO total_staked
    FROM positions 
    WHERE wallet_address = wallet_addr AND status = 'active';
    
    -- Calculate total returns (principal + bonus for all matured/withdrawn positions)
    SELECT COALESCE(SUM(principal_amount + bonus_amount), 0) INTO total_returns
    FROM positions 
    WHERE wallet_address = wallet_addr AND status IN ('matured', 'withdrawn');
    
    -- Count active positions
    SELECT COUNT(*) INTO active_positions
    FROM positions 
    WHERE wallet_address = wallet_addr AND status = 'active';
    
    -- Calculate active balance (total ETH available including matured bonuses)
    SELECT COALESCE(SUM(
        CASE 
            WHEN status = 'active' THEN principal_amount
            WHEN status = 'matured' THEN principal_amount + bonus_amount
            ELSE 0
        END
    ), 0) INTO active_balance
    FROM positions 
    WHERE wallet_address = wallet_addr AND status IN ('active', 'matured');
    
    -- Build result JSON
    result := json_build_object(
        'total_staked', total_staked,
        'total_returns', total_returns,
        'active_positions', active_positions,
        'active_balance', active_balance
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get upcoming maturities
CREATE OR REPLACE FUNCTION get_upcoming_maturities(wallet_addr TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'position_id', id,
            'unlock_date', unlock_date,
            'remaining_time', EXTRACT(EPOCH FROM (unlock_date - NOW())),
            'plan_id', plan_id,
            'principal_amount', principal_amount,
            'bonus_amount', bonus_amount
        )
    ) INTO result
    FROM positions 
    WHERE wallet_address = wallet_addr 
    AND status = 'active' 
    AND unlock_date > NOW()
    ORDER BY unlock_date ASC;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
