from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from pydantic import BaseModel, Field
import uvicorn

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    # Try absolute imports first (for Docker)
    from app.database import DatabaseConnection
    from app.repositories.hand_repository import HandRepository
    from app.services.poker_service import PokerService
except ImportError:
    # Fall back to relative imports (for local development)
    from database import DatabaseConnection
    from repositories.hand_repository import HandRepository
    from services.poker_service import PokerService


app = FastAPI(
    title="Simplified Poker Backend",
    version="1.0.0",
    description="Simple Texas Hold'em backend for saving hands and calculating winners"
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for API
class PlayerAction(BaseModel):
    action: str  # fold, check, call, raise, bet, all_in
    amount: int = 0
    street: str = "preflop"  # preflop, flop, turn, river


class PlayerData(BaseModel):
    player_id: int
    position: int
    hole_cards: str = Field(..., min_length=4, max_length=4)
    stack_size: int
    actions: List[PlayerAction] = []
    folded: bool = False


class HandRequest(BaseModel):
    players: List[PlayerData]
    board_cards: str = Field(..., min_length=10, max_length=10)
    pot_size: int
    small_blind: int = 20
    big_blind: int = 40


class HandResponse(BaseModel):
    hand_uuid: str
    winners: List[int]
    pot_size: int
    winnings_by_player: Dict[int, int]
    best_hands: Dict[str, str]


# Dependency injection
def get_db():
    return DatabaseConnection()


def get_hand_repository(db: DatabaseConnection = Depends(get_db)):
    return HandRepository(db)


def get_poker_service(hand_repo: HandRepository = Depends(get_hand_repository)):
    return PokerService(hand_repo)


# API Endpoints
@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "Simplified Poker Backend",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/hands", response_model=HandResponse)
def save_and_calculate_hand(
    hand_request: HandRequest,
    poker_service: PokerService = Depends(get_poker_service)
):
    """
    Save a completed hand and calculate the winner
    This is the main endpoint for processing hands
    """
    try:
        # Convert Pydantic models to dicts
        hand_data = {
            'players': [player.dict() for player in hand_request.players],
            'board_cards': hand_request.board_cards,
            'pot_size': hand_request.pot_size,
            'small_blind': hand_request.small_blind,
            'big_blind': hand_request.big_blind
        }
        
        # Process hand and calculate winners
        result = poker_service.process_hand(hand_data)
        
        return HandResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/hands")
def get_all_hands(poker_service: PokerService = Depends(get_poker_service)):
    """
    Retrieve all hands for the hand history log
    Returns formatted hand logs with:
    - Hand UUID
    - Stack settings and positions
    - Hole cards
    - Action sequence
    - Winnings
    """
    try:
        hands = poker_service.get_hand_history()
        return hands
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/hands/{hand_uuid}")
def get_hand_details(
    hand_uuid: str,
    poker_service: PokerService = Depends(get_poker_service)
):
    """Get detailed information about a specific hand"""
    try:
        hand = poker_service.get_hand_details(hand_uuid)
        if not hand:
            raise HTTPException(status_code=404, detail="Hand not found")
        return hand
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )