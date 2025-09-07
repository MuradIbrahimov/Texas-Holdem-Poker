from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


class ActionType(str, Enum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    RAISE = "raise"
    ALL_IN = "all_in"


class Street(str, Enum):
    PREFLOP = "preflop"
    FLOP = "flop"
    TURN = "turn"
    RIVER = "river"


@dataclass
class PlayerAction:
    """Represents a single action by a player"""
    player_id: int
    action: ActionType
    amount: int = 0
    street: Street = Street.PREFLOP


@dataclass
class PlayerData:
    """Represents a player's data for a hand"""
    player_id: int
    position: int
    hole_cards: str  # Format: "AhKs" (Ace of hearts, King of spades)
    stack_size: int
    actions: List[PlayerAction] = field(default_factory=list)
    final_stack: int = 0
    winnings: int = 0


@dataclass
class HandResult:
    """Results of a completed hand"""
    hand_id: int
    winners: List[int]  # Player IDs who won
    pot_size: int
    winnings_by_player: Dict[int, int]  # player_id -> winnings
    best_hands: Dict[int, str]  # player_id -> hand description


# Pydantic models for API
class PlayerActionRequest(BaseModel):
    player_id: int
    action: ActionType
    amount: int = 0
    street: Street = Street.PREFLOP


class PlayerDataRequest(BaseModel):
    player_id: int
    position: int
    hole_cards: str = Field(..., min_length=4, max_length=4)
    stack_size: int = Field(..., gt=0)
    actions: List[PlayerActionRequest] = []
    
    @validator('hole_cards')
    def validate_hole_cards(cls, v):
        """Validate hole cards format"""
        if len(v) != 4:
            raise ValueError('Hole cards must be exactly 4 characters (e.g., "AhKs")')
        
        valid_ranks = '23456789TJQKA'
        valid_suits = 'hdcs'
        
        if v[0] not in valid_ranks or v[2] not in valid_ranks:
            raise ValueError('Invalid card rank. Use 2-9, T, J, Q, K, A')
        
        if v[1] not in valid_suits or v[3] not in valid_suits:
            raise ValueError('Invalid suit. Use h, d, c, s')
        
        # Check for duplicate cards
        if v[:2] == v[2:4]:
            raise ValueError('Cannot have duplicate cards')
        
        return v


class HandRequest(BaseModel):
    """Request to process a complete poker hand"""
    players: List[PlayerDataRequest] = Field(..., min_items=2, max_items=6)
    board_cards: str = Field(..., min_length=10, max_length=10)
    pot_size: int = Field(..., gt=0)
    small_blind: int = Field(default=20, gt=0)
    big_blind: int = Field(default=40, gt=0)
    
    @validator('board_cards')
    def validate_board_cards(cls, v):
        """Validate board cards format"""
        if len(v) != 10:
            raise ValueError('Board cards must be exactly 10 characters (5 cards)')
        
        valid_ranks = '23456789TJQKA'
        valid_suits = 'hdcs'
        
        cards = []
        for i in range(0, 10, 2):
            card = v[i:i+2]
            if card[0] not in valid_ranks:
                raise ValueError(f'Invalid card rank in {card}. Use 2-9, T, J, Q, K, A')
            if card[1] not in valid_suits:
                raise ValueError(f'Invalid suit in {card}. Use h, d, c, s')
            cards.append(card)
        
        # Check for duplicate cards
        if len(set(cards)) != 5:
            raise ValueError('Duplicate cards found in board')
        
        return v
    
    @validator('players')
    def validate_players(cls, v, values):
        """Validate players data"""
        if 'board_cards' in values:
            # Collect all cards to check for duplicates
            all_cards = []
            
            # Add board cards
            board_cards = values['board_cards']
            for i in range(0, len(board_cards), 2):
                all_cards.append(board_cards[i:i+2])
            
            # Add hole cards
            for player in v:
                for i in range(0, len(player.hole_cards), 2):
                    all_cards.append(player.hole_cards[i:i+2])
            
            # Check for duplicates
            if len(set(all_cards)) != len(all_cards):
                raise ValueError('Duplicate cards found across board and players')
        
        # Check for duplicate player IDs
        player_ids = [player.player_id for player in v]
        if len(set(player_ids)) != len(player_ids):
            raise ValueError('Duplicate player IDs found')
        
        return v


class HandResponse(BaseModel):
    """Response after processing a hand"""
    hand_id: int
    winners: List[int]
    pot_size: int
    winnings_by_player: Dict[int, int]
    best_hands: Dict[int, str]


class HandLogEntry(BaseModel):
    """Hand log entry for display"""
    id: int
    players_count: int
    pot_size: int
    winners: List[int]
    board_cards: str
    created_at: datetime