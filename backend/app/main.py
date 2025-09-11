# backend/app/main.py - Fixed with proper host binding and error handling

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from pydantic import BaseModel, Field
import uvicorn
import sys
import os

# Add the parent directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    # Try absolute imports first (for Docker)
    from app.database import DatabaseConnection
    from app.repositories.hand_repository import HandRepository
    from app.services.poker_service import PokerService
except ImportError:
    try:
        # Fall back to relative imports (for local development)
        from database import DatabaseConnection
        from repositories.hand_repository import HandRepository
        from services.poker_service import PokerService
    except ImportError as e:
        print(f"Import error: {e}")
        print("Make sure you're running from the backend directory")
        sys.exit(1)

app = FastAPI(
    title="Simplified Poker Backend",
    version="1.0.0",
    description="Simple Texas Hold'em backend for saving hands and calculating winners"
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database connection
try:
    db = DatabaseConnection()
    db.init_db()
    print("✅ Database initialized successfully")
except Exception as e:
    print(f"❌ Database initialization failed: {e}")
    print("Make sure PostgreSQL is running and accessible")

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
    try:
        return DatabaseConnection()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

def get_hand_repository(db: DatabaseConnection = Depends(get_db)):
    try:
        return HandRepository(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Repository initialization failed: {str(e)}")

def get_poker_service(hand_repo: HandRepository = Depends(get_hand_repository)):
    try:
        return PokerService(hand_repo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Service initialization failed: {str(e)}")

# API Endpoints
@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "Simplified Poker Backend",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/",
            "docs": "/docs",
            "hands": "/hands"
        }
    }

@app.get("/health")
def health_check():
    """Detailed health check"""
    try:
        # Test database connection
        db = DatabaseConnection()
        db.execute_query("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
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
        raise HTTPException(status_code=400, detail=f"Hand processing failed: {str(e)}")

@app.get("/hands")
def get_all_hands(poker_service: PokerService = Depends(get_poker_service)):
    """
    Retrieve all hands for the hand history log
    Returns simple response for testing
    """
    try:
        # First, let's try a simple database query to see if it works
        db = DatabaseConnection()
        result = db.execute_query("SELECT COUNT(*) as count FROM hands")
        hand_count = result[0]['count'] if result else 0
        
        if hand_count == 0:
            return {
                "message": "No hands found in database",
                "hands": [],
                "count": 0
            }
        
        # If there are hands, try to get them
        hands = poker_service.get_hand_history()
        return {
            "message": "Hands retrieved successfully",
            "hands": hands,
            "count": len(hands)
        }
        
    except Exception as e:
        print(f"Error in get_all_hands endpoint: {e}")
        import traceback
        traceback.print_exc()
        
        # Return a simple error response instead of raising exception
        return {
            "error": "Failed to retrieve hands",
            "detail": str(e),
            "hands": [],
            "count": 0
        }

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
        raise HTTPException(status_code=500, detail=f"Failed to retrieve hand: {str(e)}")

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return {
        "error": "Internal server error",
        "detail": str(exc),
        "path": str(request.url)
    }

if __name__ == "__main__":
    print("🚀 Starting Poker Backend Server...")
    print("📍 Server will be available at:")
    print("   - http://localhost:8000")
    print("   - http://127.0.0.1:8000")
    print("📚 API Documentation at:")
    print("   - http://localhost:8000/docs")
    
    uvicorn.run(
        "main:app",  # Use main:app instead of app.main:app
        host="127.0.0.1",  # Use localhost instead of 0.0.0.0
        port=8000,
        reload=True,
        log_level="info"
    )