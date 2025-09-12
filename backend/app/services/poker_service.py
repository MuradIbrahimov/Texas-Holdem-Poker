from typing import List, Dict, Tuple
from pokerkit import StandardHighHand
try:
    from app.repositories.hand_repository import HandRepository
except ImportError:
    from repositories.hand_repository import HandRepository


class PokerService:    
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
        
        hand_uuid = self.hand_repo.save_hand(save_data)
        
        return {
            'hand_uuid': hand_uuid,
            'winners': winners,
            'pot_size': hand_data['pot_size'],
            'winnings_by_player': winnings_by_player,
            'best_hands': best_hands
        }
    
    def _evaluate_all_hands(self, players: List[dict], board_cards: str) -> Dict[int, Tuple]:
        evaluations = {}

        for player in players:
            if not player.get('hole_cards') or player.get('folded', False):
                continue

            best_hand = StandardHighHand.from_game(
                player['hole_cards'],
                board_cards
            )

            evaluations[player['player_id']] = (
                best_hand,        # Keep full hand object for comparison
                str(best_hand)    # Use string for readable description
            )

        return evaluations

    def _calculate_winnings(self, evaluations: Dict, pot_size: int, players: List[dict]) -> Tuple:
        if not evaluations:
            return [], {}, {}

        # Find the best hand using pokerkit comparisons
        best_hand = max(hand for hand, _ in evaluations.values())

        # Winners are all players whose hand equals best_hand
        winners = [
            player_id for player_id, (hand, _) in evaluations.items()
            if hand == best_hand
        ]

        winnings_by_player = {}
        if winners:
            win_amount = pot_size // len(winners)
            remainder = pot_size % len(winners)
            for i, winner_id in enumerate(winners):
                winnings_by_player[winner_id] = win_amount + (1 if i < remainder else 0)

        # Non-winners lose
        for player in players:
            player_id = player['player_id']
            if player_id not in winnings_by_player:
                player_contribution = self._estimate_player_contribution(player)
                winnings_by_player[player_id] = -player_contribution

        # Return best hands in readable format
        best_hands = {
            str(player_id): desc for player_id, (_, desc) in evaluations.items()
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