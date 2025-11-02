-- Create wallet_requests table for admin approval system
CREATE TABLE IF NOT EXISTS wallet_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('paypal', 'bank', 'crypto')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_requests_user_id ON wallet_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_status ON wallet_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_created_at ON wallet_requests(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE wallet_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to insert their own requests
CREATE POLICY "Users can insert their own wallet requests" ON wallet_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to view their own requests
CREATE POLICY "Users can view their own wallet requests" ON wallet_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for admin to view all requests (you'll need to set up admin role)
-- For now, we'll allow service role to access all data
CREATE POLICY "Service role can manage all wallet requests" ON wallet_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Insert some sample data for testing (optional)
-- INSERT INTO wallet_requests (user_id, wallet_address, wallet_type, status) VALUES
-- ('sample-user-uuid', 'paypal@example.com', 'paypal', 'pending'),
-- ('sample-user-uuid-2', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'crypto', 'approved');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wallet_requests_updated_at 
    BEFORE UPDATE ON wallet_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();