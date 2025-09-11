# backend/app/repositories/hand_repository.py - Fixed to handle completed_at

import uuid
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    from app.database import DatabaseConnection
except ImportError:
    from database import DatabaseConnection

class HandRepository:
    def __init__(self, db: DatabaseConnection):
        self.db = db
    
    def save_hand(self, hand_data: dict) -> str:
        """
        Save a completed hand to the database
        Returns the UUID of the saved hand
        """
        hand_uuid = str(uuid.uuid4())
        
        # Serialize complex data
        players_json = json.dumps(hand_data.get('players_data', []))
        results_json = json.dumps(hand_data.get('results', {}))
        
        query = """
            INSERT INTO hands (
                uuid, players_data, board_cards, pot_size, 
                small_blind, big_blind, results
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            hand_uuid,
            players_json,
            hand_data.get('board_cards', ''),
            hand_data.get('pot_size', 0),
            hand_data.get('small_blind', 20),
            hand_data.get('big_blind', 40),
            results_json
        )
        
        self.db.execute_query(query, params)
        return hand_uuid
    
    def get_all_hands(self) -> List[Dict]:
        """
        Retrieve all hands in the exact format specified by the task
        """
        query = """
            SELECT uuid, players_data, board_cards, pot_size, 
                   small_blind, big_blind, results
            FROM hands
            ORDER BY id DESC
            LIMIT 20
        """
        
        rows = self.db.execute_query(query)
        hands = []
        
        for row in rows:
            try:
                # Parse JSON data
                players_data = json.loads(row['players_data']) if row['players_data'] else []
                results = json.loads(row['results']) if row['results'] else {}
                
                # Format exactly as specified in the task
                formatted_hand = {
                    'uuid': row['uuid'],
                    'stack_info': self._format_stack_info(players_data, row['small_blind'], row['big_blind']),
                    'hole_cards': self._format_hole_cards(players_data),
                    'action_sequence': self._format_action_sequence(players_data, row['board_cards']),
                    'winnings': self._format_winnings(results.get('winnings_by_player', {}))
                }
                
                hands.append(formatted_hand)
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error parsing hand data: {e}")
                continue
        
        return hands
    
    def _format_stack_info(self, players_data: list, sb: int, bb: int) -> str:
        """Format: 'Stacks: P1:1000, P2:980, P3:960... | P1(BTN), P2(SB), P3(BB)'"""
        try:
            stacks = []
            positions = []
            
            for p in players_data:
                # Stack info
                stack = p.get('stack_size', 1000) + p.get('totalBet', 0)
                stacks.append(f"P{p['player_id']}:{stack}")
                
                # Position info (0=BTN, 1=SB, 2=BB)
                pos = p.get('position', p['player_id'] - 1)
                if pos == 0:
                    positions.append(f"P{p['player_id']}(BTN)")
                elif pos == 1:
                    positions.append(f"P{p['player_id']}(SB)")
                elif pos == 2:
                    positions.append(f"P{p['player_id']}(BB)")
            
            return f"{', '.join(stacks)} | {', '.join(positions)}"
        except:
            return "Stack info unavailable"
    
    def _format_hole_cards(self, players_data: list) -> str:
        """Format: 'P1:AhKs, P2:QdQc, P3:7h2d...'"""
        try:
            cards = []
            for p in players_data:
                hole_cards = p.get('hole_cards', '')
                if hole_cards:
                    cards.append(f"P{p['player_id']}:{hole_cards}")
            return ', '.join(cards)
        except:
            return "Hole cards unavailable"
    
    def _format_action_sequence(self, players_data: list, board_cards: str) -> str:
        """
        Format actions in short format with board cards
        f=fold, x=check, c=call, b40=bet, r80=raise, allin=all-in
        Example: 'P1:c P2:c P3:x [2h3d4c] P1:b40 P2:f P3:c [Ts] P1:x P3:x [Kh] P1:allin P3:f'
        """
        try:
            sequence = []
            streets = {'preflop': [], 'flop': [], 'turn': [], 'river': []}
            
            # Collect actions by street
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
                        short = f'b{amount}' if amount else 'b'
                    elif action_type == 'raise':
                        short = f'r{amount}' if amount else 'r'
                    elif action_type == 'all_in':
                        short = 'allin'
                    else:
                        short = action_type[0]
                    
                    streets[street].append(f"P{player_id}:{short}")
            
            # Build sequence with board cards
            if streets['preflop']:
                sequence.extend(streets['preflop'])
            
            # Add board cards between streets
            if board_cards and len(board_cards) >= 6:  # Has flop
                flop = f"[{board_cards[:6]}]"
                sequence.append(flop)
                if streets['flop']:
                    sequence.extend(streets['flop'])
                
                if len(board_cards) >= 8:  # Has turn
                    turn = f"[{board_cards[6:8]}]"
                    sequence.append(turn)
                    if streets['turn']:
                        sequence.extend(streets['turn'])
                    
                    if len(board_cards) >= 10:  # Has river
                        river = f"[{board_cards[8:10]}]"
                        sequence.append(river)
                        if streets['river']:
                            sequence.extend(streets['river'])
            
            return ' '.join(sequence)
        except:
            return "Action sequence unavailable"
    
    def _format_winnings(self, winnings_by_player: dict) -> str:
        """Format: 'P1:+240, P2:-40, P3:-40...'"""
        try:
            winnings = []
            for player_id, amount in winnings_by_player.items():
                if amount > 0:
                    winnings.append(f"P{player_id}:+{amount}")
                else:
                    winnings.append(f"P{player_id}:{amount}")
            return ', '.join(winnings)
        except:
            return "Winnings unavailable"
    
    def get_hand_by_id(self, hand_uuid: str) -> Optional[Dict]:
        """Get a specific hand by UUID"""
        query = """
            SELECT uuid, players_data, board_cards, pot_size, 
                   small_blind, big_blind, results
            FROM hands
            WHERE uuid = %s
        """
        
        rows = self.db.execute_query(query, (hand_uuid,))
        if not rows:
            return None
            
        row = rows[0]
        return {
            'uuid': row['uuid'],
            'players_data': json.loads(row['players_data']) if row['players_data'] else [],
            'board_cards': row['board_cards'],
            'pot_size': row['pot_size'],
            'results': json.loads(row['results']) if row['results'] else {}
        }