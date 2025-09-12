# backend/app/models/hand.py - Hand entity with @dataclass

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime


@dataclass
class PlayerAction:
    """Represents a single player action in a poker hand"""
    action: str  # fold, check, call, raise, bet, all_in
    amount: int = 0
    street: str = "preflop"  # preflop, flop, turn, river


@dataclass
class PlayerData:
    """Represents a player's data in a poker hand"""
    player_id: int
    position: int
    hole_cards: str
    stack_size: int
    actions: List[PlayerAction] = field(default_factory=list)
    folded: bool = False
    total_bet: int = 0


@dataclass
class HandResults:
    """Represents the results of a completed hand"""
    winners: List[int]
    winnings_by_player: Dict[int, int]
    best_hands: Dict[str, str]


@dataclass
class Hand:
    """Main entity representing a complete poker hand"""
    uuid: str
    players_data: List[PlayerData]
    board_cards: str
    pot_size: int
    small_blind: int = 20
    big_blind: int = 40
    results: Optional[HandResults] = None
    completed_at: Optional[datetime] = None


@dataclass
class HandHistoryEntry:
    """Simplified hand entry for history display"""
    uuid: str
    stack_info: str
    hole_cards: str
    action_sequence: str
    winnings: str