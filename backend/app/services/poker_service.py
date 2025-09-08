from typing import List, Dict, Tuple
from pokerkit import Card, StandardHighHand
try:
    from app.repositories.hand_repository import HandRepository
except ImportError:
    from repositories.hand_repository import HandRepository


class PokerService:
    """Service for poker hand evaluation and winner calculation"""
    
    def __init__(self, hand_repo: HandRepository):
        self.hand_repo = hand_repo
    
    def process_hand(self, hand_data: dict) -> dict:
        """
        Process a completed hand and calculate winners
        
        hand_data should contain:
        - players: list of player data with hole_cards, stack_size, actions
        - board_cards: string of 5 community cards (e.g., "2h3d4c5s6h")
        - pot_size: total pot size
        - small_blind: small blind amount
        - big_blind: big blind amount
        """
        
        # Evaluate hands and determine winners
        evaluations = self._evaluate_all_hands(hand_data['players'], hand_data['board_cards'])
        
        # Calculate winnings
        winners, winnings_by_player, best_hands = self._calculate_winnings(
            evaluations, 
            hand_data['pot_size'],
            hand_data['players']
        )
        
        # Prepare data for saving
        save_data = {
            'players_data': hand_data['players'],
            'board_cards': hand_data['board_cards'],
            'pot_size': hand_data['pot_size'],
            'small_blind': hand_data.get('small_blind', 20),
            'big_blind': hand_data.get('big_blind', 40),
            'results': {
                'winners': winners,
                'winnings_by_player': winnings_by_player,
                'best_hands': best_hands
            }
        }
        
        # Save to database
        hand_uuid = self.hand_repo.save_hand(save_data)
        
        return {
            'hand_uuid': hand_uuid,
            'winners': winners,
            'pot_size': hand_data['pot_size'],
            'winnings_by_player': winnings_by_player,
            'best_hands': best_hands
        }
    
    def _evaluate_all_hands(self, players: List[dict], board_cards: str) -> Dict[int, Tuple]:
        """
        Evaluate all player hands
        Returns dict of player_id -> (best_hand_object, hand_description)
        """
        evaluations = {}
        
        for player in players:
            # Skip folded players
            if not player.get('hole_cards') or player.get('folded', False):
                continue
            
            # Use StandardHighHand.from_game to get best 5-card hand from hole cards + board
            best_hand = StandardHighHand.from_game(
                player['hole_cards'],
                board_cards
            )
            
            # Store the hand object and description
            evaluations[player['player_id']] = (
                best_hand,  # Keep the hand object for comparison
                str(best_hand)  # String representation for description
            )
        
        return evaluations
    
    def _calculate_winnings(self, evaluations: Dict, pot_size: int, players: List[dict]) -> Tuple:
        """
        Calculate winnings based on hand evaluations
        Returns (winners_list, winnings_by_player_dict, best_hands_dict)
        """
        if not evaluations:
            return [], {}, {}
        
        # Compare hands using the built-in comparison operators
        # In pokerkit, hands can be compared directly: better hand > worse hand
        best_hand = max(hand for hand, _ in evaluations.values())
        
        # Find all winners (players whose hand equals the best hand)
        winners = [
            player_id for player_id, (hand, _) in evaluations.items() 
            if hand == best_hand
        ]
        
        # Calculate winnings
        winnings_by_player = {}
        
        # Winners split the pot
        if winners:
            win_amount = pot_size // len(winners)
            remainder = pot_size % len(winners)
            
            for i, winner_id in enumerate(winners):
                # Give remainder chips to first winner(s)
                winnings_by_player[winner_id] = win_amount + (1 if i < remainder else 0)
        
        # Calculate losses for non-winners
        for player in players:
            player_id = player['player_id']
            if player_id not in winnings_by_player:
                # Calculate how much this player put in the pot (simplified)
                player_contribution = self._estimate_player_contribution(player)
                winnings_by_player[player_id] = -player_contribution
        
        # Prepare best hands dictionary with descriptions
        best_hands = {
            str(player_id): desc 
            for player_id, (_, desc) in evaluations.items()
        }
        
        return winners, winnings_by_player, best_hands
    
    def _estimate_player_contribution(self, player: dict) -> int:
        """
        Estimate how much a player contributed to the pot based on their actions
        This is a simplified calculation
        """
        total = 0
        for action in player.get('actions', []):
            if action['action'] in ['call', 'raise', 'bet', 'all_in']:
                total += action.get('amount', 0)
        
        # If no actions recorded, assume at least the big blind
        if total == 0 and player.get('position') == 2:  # BB position
            total = 40
        elif total == 0 and player.get('position') == 1:  # SB position
            total = 20
        
        return total
    
    def get_hand_history(self) -> List[Dict]:
        """Get formatted hand history"""
        return self.hand_repo.get_all_hands()
    
    def get_hand_details(self, hand_uuid: str) -> Dict:
        """Get detailed information about a specific hand"""
        return self.hand_repo.get_hand_by_id(hand_uuid)