-- Initialize poker database tables
-- This file is automatically executed when PostgreSQL container starts

CREATE DATABASE IF NOT EXISTS poker_db;

-- Create hands table
CREATE TABLE IF NOT EXISTS hands (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    players_data TEXT,
    board_cards VARCHAR(10),
    pot_size INTEGER,
    small_blind INTEGER DEFAULT 20,
    big_blind INTEGER DEFAULT 40,
    results TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_hands_completed_at ON hands(completed_at DESC);
CREATE INDEX idx_hands_uuid ON hands(uuid);

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