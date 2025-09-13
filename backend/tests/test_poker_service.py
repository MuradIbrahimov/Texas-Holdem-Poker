import requests
import json
from typing import List, Dict

# API endpoint - adjust if your server runs on different port
API_BASE = "http://localhost:8000"

def test_poker_hands():
    """Run comprehensive tests for poker hand evaluation"""
    
    test_cases = [
        # Test 1: High Card vs Pair
        {
            "name": "High Card vs Pair",
            "hand": {
                "players": [
                    {
                        "player_id": 1,
                        "position": 0,
                        "hole_cards": "AhKs",  # Ace-King high
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    },
                    {
                        "player_id": 2,
                        "position": 1,
                        "hole_cards": "2c2d",  # Pair of twos
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    }
                ],
                "board_cards": "3h7s9cJdQh",  # No help for either
                "pot_size": 200,
                "small_blind": 20,
                "big_blind": 40
            },
            "expected_winner": [2],  # Player 2 with pair should win
            "description": "Pair of twos should beat Ace-King high"
        },
        
        # Test 2: Two Pair vs Straight
        {
            "name": "Two Pair vs Straight",
            "hand": {
                "players": [
                    {
                        "player_id": 1,
                        "position": 0,
                        "hole_cards": "AhAs",  # Pocket Aces
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    },
                    {
                        "player_id": 2,
                        "position": 1,
                        "hole_cards": "6h7s",  # 6-7 for straight
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    }
                ],
                "board_cards": "Ac8h9cTdJh",  # Board gives player 1 trips, player 2 straight
                "pot_size": 300,
                "small_blind": 20,
                "big_blind": 40
            },
            "expected_winner": [2],  # Straight beats trips
            "description": "Straight (6-7-8-9-T) should beat three Aces"
        },
        
        # Test 3: Flush vs Full House
        {
            "name": "Flush vs Full House",
            "hand": {
                "players": [
                    {
                        "player_id": 1,
                        "position": 0,
                        "hole_cards": "KhQh",  # Hearts for flush
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    },
                    {
                        "player_id": 2,
                        "position": 1,
                        "hole_cards": "5c5s",  # Pocket fives
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    }
                ],
                "board_cards": "5h8h9hThAd",  # Player 1 gets flush, Player 2 gets trips
                "pot_size": 400,
                "small_blind": 20,
                "big_blind": 40
            },
            "expected_winner": [1],  # Flush beats trips
            "description": "Heart flush should beat three fives"
        },
        
        # Test 4: Tied hands (split pot)
        {
            "name": "Split Pot - Same Straight",
            "hand": {
                "players": [
                    {
                        "player_id": 1,
                        "position": 0,
                        "hole_cards": "6h7s",
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    },
                    {
                        "player_id": 2,
                        "position": 1,
                        "hole_cards": "6c7d",
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    }
                ],
                "board_cards": "8h9cTdJsQh",  # Both make same straight
                "pot_size": 200,
                "small_blind": 20,
                "big_blind": 40
            },
            "expected_winner": [1, 2],  # Both should win (split pot)
            "description": "Both players have same straight - should split pot"
        },
        
        # Test 5: Royal Flush vs Straight Flush
        {
            "name": "Royal Flush vs Straight Flush",
            "hand": {
                "players": [
                    {
                        "player_id": 1,
                        "position": 0,
                        "hole_cards": "AhKh",  # For royal flush
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    },
                    {
                        "player_id": 2,
                        "position": 1,
                        "hole_cards": "5s6s",  # For straight flush
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    }
                ],
                "board_cards": "QhJhTh7s8s",  # Royal for P1, straight flush for P2
                "pot_size": 500,
                "small_blind": 20,
                "big_blind": 40
            },
            "expected_winner": [1],  # Royal flush beats straight flush
            "description": "Royal flush should beat 5-6-7-8-9 straight flush"
        },
        
        # Test 6: Full House vs Full House (higher trips wins)
        {
            "name": "Full House vs Full House",
            "hand": {
                "players": [
                    {
                        "player_id": 1,
                        "position": 0,
                        "hole_cards": "AhAs",  # Pocket Aces
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    },
                    {
                        "player_id": 2,
                        "position": 1,
                        "hole_cards": "KhKs",  # Pocket Kings
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    }
                ],
                "board_cards": "AdKdKc2h3s",  # Both get full house
                "pot_size": 600,
                "small_blind": 20,
                "big_blind": 40
            },
            "expected_winner": [2],  # Kings full of Aces beats Aces full of Kings
            "description": "KKK AA should beat AAA KK (trips matter more than pair)"
        },
        
        # Test 7: Folded player should not win
        {
            "name": "Folded Player Test",
            "hand": {
                "players": [
                    {
                        "player_id": 1,
                        "position": 0,
                        "hole_cards": "AhAs",  # Best possible hand
                        "stack_size": 1000,
                        "actions": [],
                        "folded": True  # But folded
                    },
                    {
                        "player_id": 2,
                        "position": 1,
                        "hole_cards": "2c3d",  # Terrible hand
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    }
                ],
                "board_cards": "4h5s6c7h8d",  # Straight for both
                "pot_size": 100,
                "small_blind": 20,
                "big_blind": 40
            },
            "expected_winner": [2],  # Player 2 wins because player 1 folded
            "description": "Folded player should not win even with better cards"
        },
        
        # Test 8: Three players with different hands
        {
            "name": "Three Player Test",
            "hand": {
                "players": [
                    {
                        "player_id": 1,
                        "position": 0,
                        "hole_cards": "AsKs",  # No flush (spades, not hearts)
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    },
                    {
                        "player_id": 2,
                        "position": 1,
                        "hole_cards": "QcQd",  # Pair of Queens
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    },
                    {
                        "player_id": 3,
                        "position": 2,
                        "hole_cards": "7h8h",  # For flush
                        "stack_size": 1000,
                        "actions": [],
                        "folded": False
                    }
                ],
                "board_cards": "2h4h9hJhTs",  # Player 3 gets flush
                "pot_size": 300,
                "small_blind": 20,
                "big_blind": 40
            },
            "expected_winner": [3],  # Player 3 with flush should win
            "description": "Flush should beat pair and high card"
        }
    ]
    
    print("=" * 60)
    print("TEXAS HOLD'EM WINNER DETECTION TEST SUITE")
    print("=" * 60)
    
    passed_tests = 0
    total_tests = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🎲 Test {i}: {test_case['name']}")
        print(f"📝 {test_case['description']}")
        
        try:
            # Send request to API
            response = requests.post(f"{API_BASE}/hands", json=test_case['hand'])
            
            if response.status_code != 200:
                print(f"❌ API Error: {response.status_code} - {response.text}")
                continue
                
            result = response.json()
            
            # Check if winners match expected
            actual_winners = sorted(result['winners'])
            expected_winners = sorted(test_case['expected_winner'])
            
            print(f"🔍 Expected winners: {expected_winners}")
            print(f"🎯 Actual winners: {actual_winners}")
            
            # Display best hands
            print("🃏 Hand evaluations:")
            for player_id, hand_desc in result['best_hands'].items():
                print(f"   Player {player_id}: {hand_desc}")
            
            # Check winnings distribution
            print("💰 Winnings:")
            for player_id, winnings in result['winnings_by_player'].items():
                print(f"   Player {player_id}: {winnings:+d}")
            
            if actual_winners == expected_winners:
                print("✅ PASSED")
                passed_tests += 1
            else:
                print("❌ FAILED - Winners don't match expected result")
                
        except requests.exceptions.ConnectionError:
            print("❌ ERROR: Cannot connect to API. Make sure your server is running on localhost:8000")
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
        
        print("-" * 40)
    
    print(f"\n🏆 TEST SUMMARY: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! Your winner detection logic is working correctly!")
    else:
        print(f"⚠️  {total_tests - passed_tests} test(s) failed. Check the logic for those scenarios.")
    
    return passed_tests == total_tests


def test_single_scenario():
    """Test a single specific scenario for debugging"""
    print("\n🔧 DEBUGGING SINGLE SCENARIO")
    print("=" * 40)
    
    # Simple test case for debugging
    test_hand = {
        "players": [
            {
                "player_id": 1,
                "position": 0,
                "hole_cards": "AhAs",  # Pocket Aces
                "stack_size": 1000,
                "actions": [],
                "folded": False
            },
            {
                "player_id": 2,
                "position": 1,
                "hole_cards": "KhKs",  # Pocket Kings
                "stack_size": 1000,
                "actions": [],
                "folded": False
            }
        ],
        "board_cards": "2c3d4h5s7c",  # No help
        "pot_size": 200,
        "small_blind": 20,
        "big_blind": 40
    }
    
    try:
        response = requests.post(f"{API_BASE}/hands", json=test_hand)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response successful")
            print(f"Winners: {result['winners']}")
            print(f"Best hands: {result['best_hands']}")
            print(f"Winnings: {result['winnings_by_player']}")
            
            # Should be player 1 (Aces > Kings)
            if result['winners'] == [1]:
                print("✅ Correct: Aces beat Kings")
            else:
                print("❌ Error: Aces should beat Kings")
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("Starting poker winner detection tests...")
    print("Make sure your FastAPI server is running on localhost:8000")
    
    # Run single test first for basic connectivity
    test_single_scenario()
    
    # Run full test suite
    test_poker_hands()