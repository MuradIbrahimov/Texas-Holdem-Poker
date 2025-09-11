# backend/app/repositories/hand_repository.py - Complete fixed version

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
                
                # Format exactly as specified in the task - 5 lines
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
    
    # Fix in backend/app/repositories/hand_repository.py
# Update the _format_stack_info method to dynamically determine positions

    def _format_stack_info(self, players_data: list, sb: int, bb: int) -> str:
        """Format: 'Stack 1000: Dealer: Player X, Player Y Small blind: Player Z'"""
        try:
            # Get initial stack (from first active player)
            initial_stack = 1000  # Default
            if players_data:
                initial_stack = players_data[0].get('stack_size', 1000) + players_data[0].get('totalBet', 0)
            
            # Get actual player IDs who are playing
            active_player_ids = [p['player_id'] for p in players_data if not p.get('folded', False)]
            
            # If we don't have enough active players, use the ones we have
            if len(active_player_ids) < 3:
                # Use whatever players we have
                dealer = f"Player {active_player_ids[0]}" if len(active_player_ids) > 0 else "Player 1"
                small_blind = f"Player {active_player_ids[1]}" if len(active_player_ids) > 1 else "Player 2"
                big_blind = f"Player {active_player_ids[0]}" if len(active_player_ids) == 1 else "Player 3"
            else:
                # Determine positions based on player positions in data
                # Position 0 = Button/Dealer, 1 = SB, 2 = BB
                dealer = None
                small_blind = None
                big_blind = None
                
                for p in players_data:
                    pos = p.get('position', -1)
                    player_id = p['player_id']
                    
                    if pos == 0:  # Button/Dealer
                        dealer = f"Player {player_id}"
                    elif pos == 1:  # Small Blind
                        small_blind = f"Player {player_id}"
                    elif pos == 2:  # Big Blind
                        big_blind = f"Player {player_id}"
                
                # Fallback if positions not properly set
                if not dealer:
                    dealer = f"Player {players_data[0]['player_id']}" if players_data else "Player 1"
                if not small_blind:
                    small_blind = f"Player {players_data[1]['player_id']}" if len(players_data) > 1 else "Player 2"
                if not big_blind:
                    big_blind = f"Player {players_data[2]['player_id']}" if len(players_data) > 2 else "Player 3"
            
            return f"Stack {initial_stack}: Dealer: {dealer}, {small_blind} Small blind: {big_blind}"
            
        except Exception as e:
            print(f"Error formatting stack info: {e}")
            return "Stack 1000: Dealer: Player 1, Player 2 Small blind: Player 3"
    
    def _format_hole_cards(self, players_data: list) -> str:
        """Format: 'Players: Player 1: 7h8s, Player 2: KdQs, ...'"""
        try:
            cards = []
            for p in players_data:
                player_id = p['player_id']
                hole_cards = p.get('hole_cards', '')
                if hole_cards:
                    # Format cards with space between them
                    card1 = hole_cards[:2] if len(hole_cards) >= 2 else ''
                    card2 = hole_cards[2:4] if len(hole_cards) >= 4 else ''
                    if card1 and card2:
                        cards.append(f"Player {player_id}: {card1} {card2}")
            
            if cards:
                return f"Players: {', '.join(cards)}"
            else:
                return "Players: No hole cards available"
        except:
            return "Players: Hole cards unavailable"
    
    def _format_action_sequence(self, players_data: list, board_cards: str) -> str:
        """
        Format ALL actions and board cards on ONE LINE with amounts
        Example: 'Actions: f f f r300 c f 3hKdQs x b100 c Ac x x Th b80 r160 c'
        """
        try:
            all_actions = []
            
            # Collect all actions in order by street
            action_groups = {'preflop': [], 'flop': [], 'turn': [], 'river': []}
            
            for player in players_data:
                for action in player.get('actions', []):
                    street = action.get('street', 'preflop')
                    action_type = action['action']
                    amount = action.get('amount', 0)
                    
                    # Convert to short format WITH amounts
                    if action_type == 'fold':
                        short = 'f'
                    elif action_type == 'check':
                        short = 'x'
                    elif action_type == 'call':
                        # Call should show the amount called
                        short = f'c{amount}' if amount > 0 else 'c'
                    elif action_type == 'bet':
                        # Always show bet amount
                        short = f'b{amount}'
                    elif action_type == 'raise':
                        # Always show raise amount
                        short = f'r{amount}'
                    elif action_type == 'all_in':
                        # Show all-in amount
                        short = f'allin{amount}' if amount > 0 else 'allin'
                    else:
                        short = action_type[0]
                    
                    if street in action_groups:
                        action_groups[street].append(short)
            
            # Build sequence: preflop actions, flop cards, flop actions, turn card, etc.
            # Add preflop actions
            all_actions.extend(action_groups['preflop'])
            
            # Add flop cards and actions
            if board_cards and len(board_cards) >= 6:
                all_actions.append(board_cards[:6])  # Flop cards (no brackets)
                all_actions.extend(action_groups['flop'])
                
                # Add turn card and actions
                if len(board_cards) >= 8:
                    all_actions.append(board_cards[6:8])  # Turn card
                    all_actions.extend(action_groups['turn'])
                    
                    # Add river card and actions  
                    if len(board_cards) >= 10:
                        all_actions.append(board_cards[8:10])  # River card
                        all_actions.extend(action_groups['river'])
            
            # Join everything with spaces
            action_string = ' '.join(all_actions)
            return f"Actions: {action_string}" if action_string else "Actions: none"
            
        except Exception as e:
            print(f"Error formatting actions: {e}")
            return "Actions: unavailable"
    
    def _format_winnings(self, winnings_by_player: dict) -> str:
        """Format: 'Winnings: Player 1: -40, Player 2: 0, Player 3: -560, Player 4: +600'"""
        try:
            winnings = []
            
            # Sort by player ID for consistent ordering
            sorted_players = sorted(winnings_by_player.items(), key=lambda x: int(x[0]))
            
            for player_id, amount in sorted_players:
                if amount > 0:
                    winnings.append(f"Player {player_id}: +{amount}")
                else:
                    winnings.append(f"Player {player_id}: {amount}")
            
            if winnings:
                return f"Winnings: {', '.join(winnings)}"
            else:
                return "Winnings: Not available"
        except:
            return "Winnings: Error calculating"
    
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