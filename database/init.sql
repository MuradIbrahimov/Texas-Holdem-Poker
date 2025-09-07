-- Initialize poker database tables
-- This file is automatically executed when PostgreSQL container starts

-- Create hands table to store completed poker hands
CREATE TABLE IF NOT EXISTS hands (
    id SERIAL PRIMARY KEY,
    players_data JSONB NOT NULL,
    board_cards VARCHAR(20) NOT NULL,
    pot_size INTEGER NOT NULL,
    small_blind INTEGER NOT NULL DEFAULT 20,
    big_blind INTEGER NOT NULL DEFAULT 40,
    results JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on created_at for faster ordering (newest first)
CREATE INDEX IF NOT EXISTS idx_hands_created_at ON hands(created_at DESC);

-- Create index on players_data for faster player-specific queries
CREATE INDEX IF NOT EXISTS idx_hands_players_data ON hands USING GIN (players_data);

-- Create index on pot_size for analytics queries
CREATE INDEX IF NOT EXISTS idx_hands_pot_size ON hands(pot_size);

-- Insert sample data for testing (optional - remove in production)
-- Sample hand 1: Aces vs Kings
INSERT INTO hands (players_data, board_cards, pot_size, small_blind, big_blind, results) 
VALUES (
    '[
        {
            "player_id": 1,
            "position": 0,
            "hole_cards": "AhAs",
            "stack_size": 1000,
            "final_stack": 1160,
            "winnings": 160,
            "actions": [
                {"action": "raise", "amount": 80, "street": "preflop"}
            ]
        },
        {
            "player_id": 2,
            "position": 1,
            "hole_cards": "KhKs",
            "stack_size": 1000,
            "final_stack": 920,
            "winnings": -80,
            "actions": [
                {"action": "call", "amount": 80, "street": "preflop"}
            ]
        }
    ]'::jsonb,
    '2h3d4c5s6h',
    160,
    20,
    40,
    '{
        "winners": [1],
        "pot_size": 160,
        "winnings_by_player": {"1": 80, "2": -80},
        "best_hands": {"1": "Pair of Aces", "2": "Pair of Kings"}
    }'::jsonb
);

-- Sample hand 2: Split pot scenario
INSERT INTO hands (players_data, board_cards, pot_size, small_blind, big_blind, results) 
VALUES (
    '[
        {
            "player_id": 1,
            "position": 0,
            "hole_cards": "AhKs",
            "stack_size": 1000,
            "final_stack": 1000,
            "winnings": 0,
            "actions": [
                {"action": "raise", "amount": 80, "street": "preflop"}
            ]
        },
        {
            "player_id": 2,
            "position": 1,
            "hole_cards": "AdKh",
            "stack_size": 1000,
            "final_stack": 1000,
            "winnings": 0,
            "actions": [
                {"action": "call", "amount": 80, "street": "preflop"}
            ]
        }
    ]'::jsonb,
    '2h3d4c5s7c',
    160,
    20,
    40,
    '{
        "winners": [1, 2],
        "pot_size": 160,
        "winnings_by_player": {"1": 0, "2": 0},
        "best_hands": {"1": "Ace high", "2": "Ace high"}
    }'::jsonb
);

-- Grant necessary permissions (already handled by Docker environment)
-- The poker_user should already have full access to the poker_game database