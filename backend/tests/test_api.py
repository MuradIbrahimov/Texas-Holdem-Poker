# backend/tests/test_api.py

import pytest
from fastapi.testclient import TestClient
import json
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["status"] == "running"


def test_health_endpoint():
    """Test the detailed health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data


def test_post_hand_valid():
    """Test posting a valid hand"""
    hand_data = {
        "players": [
            {
                "player_id": 1,
                "position": 0,
                "hole_cards": "AhAs",
                "stack_size": 1000,
                "actions": [],
                "folded": False
            },
            {
                "player_id": 2,
                "position": 1,
                "hole_cards": "KhKs",
                "stack_size": 980,
                "actions": [],
                "folded": False
            }
        ],
        "board_cards": "2h3d4c5s6h",
        "pot_size": 240,
        "small_blind": 20,
        "big_blind": 40
    }
    
    response = client.post("/hands", json=hand_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "hand_uuid" in data
    assert "winners" in data
    assert "pot_size" in data
    assert "winnings_by_player" in data
    assert "best_hands" in data


def test_post_hand_invalid_hole_cards():
    """Test posting a hand with invalid hole cards"""
    hand_data = {
        "players": [
            {
                "player_id": 1,
                "position": 0,
                "hole_cards": "INVALID",  # Invalid format
                "stack_size": 1000,
                "actions": [],
                "folded": False
            }
        ],
        "board_cards": "2h3d4c5s6h",
        "pot_size": 100,
        "small_blind": 20,
        "big_blind": 40
    }
    
    response = client.post("/hands", json=hand_data)
    assert response.status_code == 422  # Validation error


def test_get_hands():
    """Test retrieving hand history"""
    response = client.get("/hands")
    assert response.status_code == 200
    
    data = response.json()
    assert "hands" in data
    assert "count" in data
    assert isinstance(data["hands"], list)


def test_hand_evaluation_logic():
    """Test that hand evaluation correctly identifies winners"""
    # Player 1 has a straight, Player 2 has a pair
    hand_data = {
        "players": [
            {
                "player_id": 1,
                "position": 0,
                "hole_cards": "7h8h",  # Makes straight with board
                "stack_size": 1000,
                "actions": [{"action": "call", "amount": 40, "street": "preflop"}],
                "folded": False
            },
            {
                "player_id": 2,
                "position": 1,
                "hole_cards": "AsAc",  # Pair of aces
                "stack_size": 980,
                "actions": [{"action": "check", "amount": 0, "street": "preflop"}],
                "folded": False
            }
        ],
        "board_cards": "4s5d6h9cTd",  # Board gives player 1 a straight
        "pot_size": 80,
        "small_blind": 20,
        "big_blind": 40
    }
    
    response = client.post("/hands", json=hand_data)
    assert response.status_code == 200
    
    data = response.json()
    # Player 1 should win with straight
    assert 1 in data["winners"]
    assert data["winnings_by_player"]["1"] > 0
    assert data["winnings_by_player"]["2"] < 0


def test_multiple_winners_split_pot():
    """Test split pot scenario"""
    hand_data = {
        "players": [
            {
                "player_id": 1,
                "position": 0,
                "hole_cards": "AhKh",
                "stack_size": 1000,
                "actions": [],
                "folded": False
            },
            {
                "player_id": 2,
                "position": 1,
                "hole_cards": "AsKs",
                "stack_size": 1000,
                "actions": [],
                "folded": False
            }
        ],
        "board_cards": "QhJhTh9h8h",  # Board has straight flush
        "pot_size": 200,
        "small_blind": 20,
        "big_blind": 40
    }
    
    response = client.post("/hands", json=hand_data)
    assert response.status_code == 200
    
    data = response.json()
    # Both players should split (both have K high)
    assert len(data["winners"]) == 2
    assert 1 in data["winners"]
    assert 2 in data["winners"]