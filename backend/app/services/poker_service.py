# backend/app/services/poker_service.py - Enhanced with optional dataclass support

from typing import List, Dict, Tuple, Union
from dataclasses import asdict
from pokerkit import StandardHighHand

try:
    from app.repositories.hand_repository import HandRepository
    from app.models.hand import Hand, PlayerData, HandResults, HandHistoryEntry
except ImportError:
    from repositories.hand_repository import HandRepository
    from models.hand import Hand, PlayerData, HandResults, HandHistoryEntry


class PokerService:    
    def __init__(self, hand_repo: HandRepository):
        self.hand_repo = hand_repo
    
    def process_hand(self, hand_data: Union[dict, Hand]) -> dict:
        """
        Process a completed hand and calculate winners
        
        Accepts both dict (existing API) and Hand dataclass (new)
        
        hand_data should contain:
        - players: list of player data with hole_cards, stack_size, actions
        - board_cards: string of 5 community cards (e.g., "2h3d4c5s6h")
        - pot_size: total pot size
        - small_blind: small blind amount
        - big_blind: big blind amount
        """
        
        # Handle both dict and dataclass input
        if isinstance(hand_data, Hand):
            # Convert dataclass to dict for processing
            data_dict = asdict(hand_data)
            # Ensure players_data key exists for compatibility
            if 'players_data' not in data_dict and 'players' in data_dict:
                data_dict['players'] = data_dict['players_data']
        else:
            # Existing dict-based input (your current API calls)
            data_dict = hand_data
        
        # Your existing evaluation logic stays exactly the same
        evaluations = self._evaluate_all_hands(data_dict['players'], data_dict['board_cards'])
        
        # Your existing calculation logic stays exactly the same
        winners, winnings_by_player, best_hands = self._calculate_winnings(
            evaluations, 
            data_dict['pot_size'],
            data_dict['players']
        )
        
        # Prepare data for saving (your existing logic)
        save_data = {
            'players_data': data_dict['players'],
            'board_cards': data_dict['board_cards'],
            'pot_size': data_dict['pot_size'],
            'small_blind': data_dict.get('small_blind', 20),
            'big_blind': data_dict.get('big_blind', 40),
            'results': {
                'winners': winners,
                'winnings_by_player': winnings_by_player,
                'best_hands': best_hands
            }
        }
        
        hand_uuid = self.hand_repo.save_hand(save_data)
        
        # Return the same dict format your API expects
        return {
            'hand_uuid': hand_uuid,
            'winners': winners,
            'pot_size': data_dict['pot_size'],
            'winnings_by_player': winnings_by_player,
            'best_hands': best_hands
        }

    def process_hand_with_dataclass(self, hand_data: Union[dict, Hand]) -> HandResults:
        """
        New method that returns HandResults dataclass instead of dict
        Your existing API can still use process_hand() for dict responses
        """
        result_dict = self.process_hand(hand_data)
        
        return HandResults(
            winners=result_dict['winners'],
            winnings_by_player=result_dict['winnings_by_player'],
            best_hands=result_dict['best_hands']
        )
    
    def _evaluate_all_hands(self, players: List[Union[dict, PlayerData]], board_cards: str) -> Dict[int, Tuple]:
        """
        Enhanced to handle both dict and PlayerData objects
        Your existing logic stays the same
        """
        evaluations = {}

        for player in players:
            # Handle both dict and dataclass
            if isinstance(player, PlayerData):
                player_dict = asdict(player)
            else:
                player_dict = player

            if not player_dict.get('hole_cards') or player_dict.get('folded', False):
                continue

            best_hand = StandardHighHand.from_game(
                player_dict['hole_cards'],
                board_cards
            )

            evaluations[player_dict['player_id']] = (
                best_hand,        # Keep full hand object for comparison
                str(best_hand)    # Use string for readable description
            )

        return evaluations

    def _calculate_winnings(self, evaluations: Dict, pot_size: int, players: List[Union[dict, PlayerData]]) -> Tuple:
        """
        Enhanced to handle both dict and PlayerData objects
        Your existing logic stays exactly the same
        """
        if not evaluations:
            return [], {}, {}

        # Your existing logic - unchanged
        best_hand = max(hand for hand, _ in evaluations.values())

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
            # Handle both dict and dataclass
            if isinstance(player, PlayerData):
                player_dict = asdict(player)
            else:
                player_dict = player

            player_id = player_dict['player_id']
            if player_id not in winnings_by_player:
                player_contribution = self._estimate_player_contribution(player_dict)
                winnings_by_player[player_id] = -player_contribution

        # Return best hands in readable format
        best_hands = {
            str(player_id): desc for player_id, (_, desc) in evaluations.items()
        }

        return winners, winnings_by_player, best_hands

    def _estimate_player_contribution(self, player: dict) -> int:
        """
        Estimate how much a player contributed to the pot based on their actions
        This is a simplified calculation - your existing logic unchanged
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
    
    def get_hand_history(self) -> List[HandHistoryEntry]:
        """
        Enhanced to return dataclass objects
        For backward compatibility, use get_hand_history_as_dicts()
        """
        return self.hand_repo.get_all_hands()

    def get_hand_history_as_dicts(self) -> List[Dict]:
        """
        Backward compatibility method - returns dicts like before
        Your existing API can keep using this
        """
        hands = self.get_hand_history()
        return [asdict(hand) for hand in hands]
    
    def get_hand_details(self, hand_uuid: str) -> Hand:
        """
        Enhanced to return Hand dataclass
        For backward compatibility, use get_hand_details_as_dict()
        """
        return self.hand_repo.get_hand_by_id(hand_uuid)

    def get_hand_details_as_dict(self, hand_uuid: str) -> Dict:
        """
        Backward compatibility method - returns dict like before
        Your existing API can keep using this
        """
        hand = self.get_hand_details(hand_uuid)
        return asdict(hand) if hand else None

    # New convenience methods using dataclasses
    def create_hand_from_data(self, players_data: List[dict], board_cards: str, pot_size: int, 
                             small_blind: int = 20, big_blind: int = 40) -> Hand:
        """
        Convenience method to create Hand dataclass from raw data
        """
        import uuid
        players = [PlayerData(**player_data) for player_data in players_data]
        
        return Hand(
            uuid=str(uuid.uuid4()),
            players_data=players,
            board_cards=board_cards,
            pot_size=pot_size,
            small_blind=small_blind,
            big_blind=big_blind
        )

    def validate_hand_data(self, hand: Hand) -> bool:
        """
        New method to validate Hand dataclass
        Returns True if hand data is valid for poker processing
        """
        try:
            # Check basic requirements
            if not hand.board_cards or len(hand.board_cards) != 10:
                return False
            
            if not hand.players_data or len(hand.players_data) < 2:
                return False
            
            # Check each player has valid hole cards
            for player in hand.players_data:
                if not player.hole_cards or len(player.hole_cards) != 4:
                    return False
                
                if player.player_id < 1:
                    return False
            
            return True
        except Exception:
            return False