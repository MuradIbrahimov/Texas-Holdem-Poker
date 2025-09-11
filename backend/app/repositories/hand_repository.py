# backend/app/repositories/hand_repository.py - Fixed with proper error handling

import json
import uuid
from typing import List, Dict, Optional
from datetime import datetime


class HandRepository:
    """Repository for hand data persistence and retrieval"""
    
    def __init__(self, db):
        self.db = db
    
    def save_hand(self, hand_data: dict) -> str:
        """
        Save a completed hand to the database
        Returns the hand UUID
        """
        hand_uuid = str(uuid.uuid4())
        
        query = """
        INSERT INTO hands (hand_uuid, players_data, board_cards, pot_size, small_blind, big_blind, results)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        params = (
            hand_uuid,
            json.dumps(hand_data['players_data']),
            hand_data['board_cards'],
            hand_data['pot_size'],
            hand_data.get('small_blind', 20),
            hand_data.get('big_blind', 40),
            json.dumps(hand_data['results'])
        )
        
        self.db.execute_insert(query, params)
        return hand_uuid
    
    def get_all_hands(self) -> List[Dict]:
        """
        Get all hands sorted by newest first
        Returns formatted hand logs for display
        """
        try:
            query = """
            SELECT 
                hand_uuid,
                players_data,
                board_cards,
                pot_size,
                small_blind,
                big_blind,
                results,
                created_at
            FROM hands
            ORDER BY created_at DESC
            """
            
            rows = self.db.execute_query(query)
            
            # Handle case where no hands exist
            if not rows:
                return []
            
            hand_logs = []
            
            for row in rows:
                try:
                    # Safely parse JSON data
                    if isinstance(row['players_data'], str):
                        players_data = json.loads(row['players_data'])
                    else:
                        players_data = row['players_data']  # Already parsed
                    
                    if isinstance(row['results'], str):
                        results = json.loads(row['results'])
                    else:
                        results = row['results']  # Already parsed
                    
                    # Format hand log entry
                    hand_log = {
                        'uuid': row['hand_uuid'],
                        'stack_info': self._format_stack_info(players_data, row['small_blind'], row['big_blind']),
                        'hole_cards': self._format_hole_cards(players_data),
                        'action_sequence': self._format_action_sequence(players_data, row['board_cards']),
                        'winnings': self._format_winnings(results.get('winnings_by_player', {})),
                        'created_at': row['created_at'].isoformat() if hasattr(row['created_at'], 'isoformat') else str(row['created_at'])
                    }
                    hand_logs.append(hand_log)
                    
                except (json.JSONDecodeError, KeyError, TypeError) as e:
                    print(f"Error processing hand {row.get('hand_uuid', 'unknown')}: {e}")
                    # Skip this hand but continue processing others
                    continue
            
            return hand_logs
            
        except Exception as e:
            print(f"Error in get_all_hands: {e}")
            return []  # Return empty list instead of crashing
    
    def _format_stack_info(self, players_data: list, sb: int, bb: int) -> str:
        """Format stack information with blinds"""
        try:
            stacks = [f"P{p['player_id']}:{p['stack_size']}" for p in players_data]
            
            # Find dealer, SB, BB positions (assuming 0=BTN, 1=SB, 2=BB in 6-max)
            positions = []
            for p in players_data:
                if p['position'] == 0:
                    positions.append(f"P{p['player_id']}(BTN)")
                elif p['position'] == 1:
                    positions.append(f"P{p['player_id']}(SB)")
                elif p['position'] == 2:
                    positions.append(f"P{p['player_id']}(BB)")
            
            return f"Stacks: {', '.join(stacks)} | Positions: {', '.join(positions)} | Blinds: {sb}/{bb}"
        except (KeyError, TypeError):
            return "Stack info unavailable"
    
    def _format_hole_cards(self, players_data: list) -> str:
        """Format hole cards for all players"""
        try:
            cards = [f"P{p['player_id']}:{p['hole_cards']}" for p in players_data]
            return f"Hole cards: {', '.join(cards)}"
        except (KeyError, TypeError):
            return "Hole cards unavailable"
    
    def _format_action_sequence(self, players_data: list, board_cards: str) -> str:
        """
        Format action sequence in short format
        f=fold, x=check, c=call, b<amount>=bet, r<amount>=raise, allin=all-in
        """
        try:
            # Collect all actions by street
            streets = {'preflop': [], 'flop': [], 'turn': [], 'river': []}
            
            for player in players_data:
                for action in player.get('actions', []):
                    street = action.get('street', 'preflop')
                    player_id = player['player_id']
                    action_type = action['action']
                    amount = action.get('amount', 0)
                    
                    # Convert to short format
                    if action_type == 'fold':
                        short = 'f'
                    elif action_type == 'check':
                        short = 'x'
                    elif action_type == 'call':
                        short = 'c'
                    elif action_type == 'bet':
                        short = f'b{amount}'
                    elif action_type == 'raise':
                        short = f'r{amount}'
                    elif action_type == 'all_in':
                        short = 'allin'
                    else:
                        short = action_type
                    
                    streets[street].append(f"P{player_id}:{short}")
            
            # Build action sequence with board cards
            sequence = []
            
            if streets['preflop']:
                sequence.append(' '.join(streets['preflop']))
            
            # Parse board cards (assuming format: "2h3d4c5s6h" - 5 cards)
            if len(board_cards) >= 6:  # Has flop
                flop = board_cards[:6]  # First 3 cards
                sequence.append(f"[{flop}]")
                if streets['flop']:
                    sequence.append(' '.join(streets['flop']))
            
            if len(board_cards) >= 8:  # Has turn
                turn = board_cards[6:8]  # 4th card
                sequence.append(f"[{turn}]")
                if streets['turn']:
                    sequence.append(' '.join(streets['turn']))
            
            if len(board_cards) >= 10:  # Has river
                river = board_cards[8:10]  # 5th card
                sequence.append(f"[{river}]")
                if streets['river']:
                    sequence.append(' '.join(streets['river']))
            
            return ' '.join(sequence)
        except (KeyError, TypeError, IndexError):
            return "Action sequence unavailable"
    
    def _format_winnings(self, winnings_by_player: dict) -> str:
        """Format winnings for each player"""
        try:
            winnings = []
            for player_id, amount in winnings_by_player.items():
                if amount > 0:
                    winnings.append(f"P{player_id}:+{amount}")
                elif amount < 0:
                    winnings.append(f"P{player_id}:{amount}")
                else:
                    winnings.append(f"P{player_id}:0")
            
            return f"Winnings: {', '.join(winnings)}"
        except (TypeError, AttributeError):
            return "Winnings unavailable"
    
    def get_hand_by_id(self, hand_uuid: str) -> Optional[Dict]:
        """Get a specific hand by UUID"""
        try:
            query = """
            SELECT 
                hand_uuid,
                players_data,
                board_cards,
                pot_size,
                small_blind,
                big_blind,
                results,
                created_at
            FROM hands
            WHERE hand_uuid = %s
            """
            
            rows = self.db.execute_query(query, (hand_uuid,))
            
            if not rows:
                return None
            
            row = rows[0]
            
            # Safely parse JSON data
            if isinstance(row['players_data'], str):
                players_data = json.loads(row['players_data'])
            else:
                players_data = row['players_data']
            
            if isinstance(row['results'], str):
                results = json.loads(row['results'])
            else:
                results = row['results']
            
            return {
                'uuid': row['hand_uuid'],
                'players_data': players_data,
                'board_cards': row['board_cards'],
                'pot_size': row['pot_size'],
                'small_blind': row['small_blind'],
                'big_blind': row['big_blind'],
                'results': results,
                'created_at': row['created_at'].isoformat() if hasattr(row['created_at'], 'isoformat') else str(row['created_at'])
            }
            
        except Exception as e:
            print(f"Error getting hand {hand_uuid}: {e}")
            return None