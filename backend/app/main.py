from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn
from app.database import DatabaseConnection
from app.repositories.hand_repository import HandRepository
from app.services.automated_poker_service import AutomatedPokerService, SimplifiedPokerService
from app.models.hand import HandRequest, HandResponse, HandLogEntry


app = FastAPI(
    title="Automated Poker Backend", 
    version="3.0.0",
    description="Texas Hold'em poker backend powered by PokerKit automations"
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    """Dependency to get database connection"""
    return DatabaseConnection()


def get_hand_repository(db: DatabaseConnection = Depends(get_db)):
    """Dependency to get hand repository"""
    return HandRepository(db)


def get_automated_poker_service(hand_repo: HandRepository = Depends(get_hand_repository)):
    """Dependency to get automated poker service"""
    return AutomatedPokerService(hand_repo)


def get_simplified_poker_service(hand_repo: HandRepository = Depends(get_hand_repository)):
    """Dependency to get simplified poker service"""
    return SimplifiedPokerService(hand_repo)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    db = DatabaseConnection()
    db.init_db()
    print("🃏 Automated Poker Backend started with PokerKit integration")


@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "message": "Automated Poker Backend with PokerKit", 
        "version": "3.0.0",
        "features": [
            "PokerKit automations",
            "Full game simulation",
            "Simplified processing",
            "Comprehensive hand evaluation"
        ]
    }


@app.get("/health")
def health_check():
    """Detailed health check for monitoring"""
    try:
        db = DatabaseConnection()
        with db.get_connection():
            return {
                "status": "healthy",
                "database": "connected",
                "version": "3.0.0",
                "pokerkit": "integrated",
                "automations": "enabled"
            }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.post("/hands", response_model=HandResponse)
def create_hand(
    hand_request: HandRequest, 
    simplified: Optional[bool] = Query(False, description="Use simplified processing for faster execution"),
    poker_service: AutomatedPokerService = Depends(get_automated_poker_service),
    simplified_service: SimplifiedPokerService = Depends(get_simplified_poker_service)
):
    """
    Process a complete poker hand using PokerKit's full automation.
    
    - **simplified**: Use simplified processing (faster, handles common cases)
    - **Default**: Full PokerKit automation with complete game simulation
    """
    try:
        if simplified:
            return simplified_service.process_hand_simple(hand_request)
        else:
            return poker_service.process_hand(hand_request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/hands/simulate", response_model=HandResponse)
def simulate_hand(
    hand_request: HandRequest,
    poker_service: AutomatedPokerService = Depends(get_automated_poker_service)
):
    """
    Simulate a complete poker hand with full PokerKit game state recreation.
    This endpoint provides the most accurate poker simulation.
    """
    try:
        return poker_service.process_hand(hand_request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/hands/quick", response_model=HandResponse)
def quick_hand_processing(
    hand_request: HandRequest,
    simplified_service: SimplifiedPokerService = Depends(get_simplified_poker_service)
):
    """
    Quick hand processing optimized for common scenarios.
    Faster execution with automatic fallback to full processing when needed.
    """
    try:
        return simplified_service.process_hand_simple(hand_request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/hands", response_model=List[HandLogEntry])
def get_hands(
    limit: Optional[int] = Query(50, description="Maximum number of hands to return", ge=1, le=1000),
    offset: Optional[int] = Query(0, description="Number of hands to skip", ge=0),
    hand_repo: HandRepository = Depends(get_hand_repository)
):
    """
    Get completed hands for the hand log with pagination.
    """
    try:
        # Note: This assumes the repository supports limit/offset
        # You might need to modify the repository to support pagination
        all_hands = hand_repo.get_all_hands()
        
        # Apply pagination in memory (could be optimized with database pagination)
        start = offset
        end = offset + limit
        paginated_hands = all_hands[start:end]
        
        return paginated_hands
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/hands/{hand_id}", response_model=HandLogEntry)
def get_hand(
    hand_id: int,
    hand_repo: HandRepository = Depends(get_hand_repository)
):
    """
    Get a specific hand by ID with detailed information.
    """
    try:
        hand = hand_repo.get_hand_by_id(hand_id)
        if not hand:
            raise HTTPException(status_code=404, detail=f"Hand with ID {hand_id} not found")
        return hand
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/hands/player/{player_id}", response_model=List[HandLogEntry])
def get_player_hands(
    player_id: int,
    limit: Optional[int] = Query(50, description="Maximum number of hands to return", ge=1, le=1000),
    hand_repo: HandRepository = Depends(get_hand_repository)
):
    """
    Get all hands for a specific player with pagination.
    """
    try:
        all_hands = hand_repo.get_hands_by_player(player_id)
        
        # Apply limit
        limited_hands = all_hands[:limit]
        
        return limited_hands
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats/summary")
def get_stats_summary(
    hand_repo: HandRepository = Depends(get_hand_repository)
):
    """
    Get summary statistics for all hands.
    """
    try:
        all_hands = hand_repo.get_all_hands()
        
        total_hands = len(all_hands)
        if total_hands == 0:
            return {
                "total_hands": 0,
                "total_pot_value": 0,
                "average_pot_size": 0,
                "average_players_per_hand": 0
            }
        
        total_pot_value = sum(hand.pot_size for hand in all_hands)
        average_pot_size = total_pot_value / total_hands
        average_players = sum(hand.players_count for hand in all_hands) / total_hands
        
        return {
            "total_hands": total_hands,
            "total_pot_value": total_pot_value,
            "average_pot_size": round(average_pot_size, 2),
            "average_players_per_hand": round(average_players, 2),
            "hands_by_player_count": _count_hands_by_players(all_hands)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/info")
def get_api_info():
    """
    Get information about the API and its capabilities.
    """
    return {
        "name": "Automated Poker Backend",
        "version": "3.0.0",
        "poker_engine": "PokerKit",
        "game_types": ["No Limit Texas Hold'em"],
        "max_players": 6,
        "features": {
            "automations": [
                "Ante posting",
                "Bet collection", 
                "Blind posting",
                "Card dealing",
                "Hand killing",
                "Chips pushing/pulling"
            ],
            "processing_modes": [
                "Full simulation",
                "Simplified processing",
                "Quick processing"
            ],
            "supported_actions": [
                "fold", "check", "call", "raise", "all_in"
            ]
        },
        "endpoints": {
            "POST /hands": "Full hand processing",
            "POST /hands/simulate": "Complete game simulation",
            "POST /hands/quick": "Quick processing",
            "GET /hands": "List all hands",
            "GET /hands/{id}": "Get specific hand",
            "GET /hands/player/{id}": "Get player's hands",
            "GET /stats/summary": "Get statistics"
        }
    }


def _count_hands_by_players(hands: List[HandLogEntry]) -> dict:
    """Helper function to count hands by number of players"""
    counts = {}
    for hand in hands:
        count = hand.players_count
        counts[count] = counts.get(count, 0) + 1
    return counts


# Error handlers
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return HTTPException(status_code=400, detail=str(exc))


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return HTTPException(status_code=500, detail="An unexpected error occurred")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )