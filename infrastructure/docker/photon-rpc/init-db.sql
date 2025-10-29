-- GhostSOL Photon RPC Database Initialization
-- Creates necessary tables and indexes for Light Protocol state storage

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- State trees table
CREATE TABLE IF NOT EXISTS state_trees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id VARCHAR(64) NOT NULL UNIQUE,
    root_hash VARCHAR(64) NOT NULL,
    leaf_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_state_trees_root_hash ON state_trees(root_hash);
CREATE INDEX idx_state_trees_updated_at ON state_trees(updated_at);

-- Compressed accounts table
CREATE TABLE IF NOT EXISTS compressed_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_hash VARCHAR(64) NOT NULL UNIQUE,
    owner VARCHAR(64) NOT NULL,
    tree_id VARCHAR(64) NOT NULL,
    leaf_index BIGINT NOT NULL,
    data JSONB NOT NULL,
    lamports BIGINT NOT NULL DEFAULT 0,
    slot BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    nullified BOOLEAN DEFAULT FALSE,
    nullified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_compressed_accounts_owner ON compressed_accounts(owner);
CREATE INDEX idx_compressed_accounts_tree_id ON compressed_accounts(tree_id);
CREATE INDEX idx_compressed_accounts_slot ON compressed_accounts(slot);
CREATE INDEX idx_compressed_accounts_nullified ON compressed_accounts(nullified);

-- Nullifiers table
CREATE TABLE IF NOT EXISTS nullifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nullifier_hash VARCHAR(64) NOT NULL UNIQUE,
    account_hash VARCHAR(64) NOT NULL,
    slot BIGINT NOT NULL,
    transaction_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nullifiers_account_hash ON nullifiers(account_hash);
CREATE INDEX idx_nullifiers_slot ON nullifiers(slot);
CREATE INDEX idx_nullifiers_tx_sig ON nullifiers(transaction_signature);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signature VARCHAR(128) NOT NULL UNIQUE,
    slot BIGINT NOT NULL,
    block_time BIGINT,
    success BOOLEAN NOT NULL,
    fee BIGINT NOT NULL DEFAULT 0,
    compressed_accounts_modified BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_slot ON transactions(slot);
CREATE INDEX idx_transactions_block_time ON transactions(block_time);

-- Indexer state table
CREATE TABLE IF NOT EXISTS indexer_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(64) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial indexer state
INSERT INTO indexer_state (key, value) VALUES
    ('last_indexed_slot', '0'::jsonb),
    ('indexer_version', '"1.0.0"'::jsonb),
    ('start_time', to_jsonb(CURRENT_TIMESTAMP))
ON CONFLICT (key) DO NOTHING;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_state_trees_updated_at BEFORE UPDATE ON state_trees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indexer_state_updated_at BEFORE UPDATE ON indexer_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO photon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO photon;

-- Create views for monitoring
CREATE OR REPLACE VIEW v_indexer_stats AS
SELECT
    (SELECT COUNT(*) FROM compressed_accounts) as total_accounts,
    (SELECT COUNT(*) FROM compressed_accounts WHERE nullified = false) as active_accounts,
    (SELECT COUNT(*) FROM nullifiers) as total_nullifiers,
    (SELECT COUNT(*) FROM transactions) as total_transactions,
    (SELECT value::text FROM indexer_state WHERE key = 'last_indexed_slot') as last_indexed_slot,
    (SELECT MAX(slot) FROM transactions) as latest_slot,
    (SELECT updated_at FROM indexer_state WHERE key = 'last_indexed_slot') as last_update;

GRANT SELECT ON v_indexer_stats TO photon;
