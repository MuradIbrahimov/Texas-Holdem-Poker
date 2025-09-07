# Poker Backend

A FastAPI-based backend service for a simplified 6-player Texas Hold'em poker game. The backend handles hand verification, win/loss calculations, and maintains a complete hand history.

## Features

- **Texas Hold'em Support**: Full support for 6-player Texas Hold'em with standard rules
- **Hand Evaluation**: Uses `pokerkit` library for accurate poker hand evaluation
- **Repository Pattern**: Clean data access layer with raw SQL queries
- **PostgreSQL Database**: Persistent storage for all completed hands
- **RESTful API**: Simple endpoints for hand processing and retrieval
- **Comprehensive Testing**: Unit tests with mocked dependencies

## Game Rules

- 6-player maximum (6max)
- Small blind: 20 chips, Big blind: 40 chips (configurable)
- No ante
- Standard Texas Hold'em with four betting rounds: preflop, flop, turn, river
- Winner determination and pot distribution handled automatically

## Project Structure

```
poker-backend/
├── app/
│   ├── __init__.py
│   ├── database.py              # Database connection manager
│   ├── models/
│   │   ├── __init__.py
│   │   └── hand.py              # Data models and API schemas
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── hand_repository.py   # Data access layer
│   └── services/
│       ├── __init__.py
│       └── poker_service.py     # Business logic and hand evaluation
├── tests/
│   ├── __init__.py
│   └── test_hands.py           # API tests
├── main.py                     # FastAPI application
├── pyproject.toml             # Poetry configuration
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL 12+
- Poetry (for dependency management)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd poker-backend
   ```

2. **Install dependencies with Poetry**
   ```bash
   poetry install
   ```

3. **Setup PostgreSQL database**
   ```sql
   CREATE DATABASE poker_db;
   CREATE USER postgres WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE poker_db TO postgres;
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Initialize database**
   The database tables will be created automatically on first startup.

## Usage

### Running the Application

```bash
# Using Poetry
poetry run python main.py

# Or activate the virtual environment
poetry shell
python main.py
```

The API will be available at `http://localhost:8000`

### API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### API Endpoints

#### POST /hands
Process a complete poker hand and calculate winnings.

**Request Body:**
```json
{
  "players": [
    {
      "player_id": 1,
      "position": 0,
      "hole_cards": "AhKs",
      "stack_size": 1000,
      "actions": [
        {
          "player_id": 1,
          "action": "raise",
          "amount": 80,
          "street": "preflop"
        }
      ]
    }
  ],
  "board_cards": "2h3d4c5s6h",
  "pot_size": 200,
  "small_blind": 20,
  "big_blind": 40
}
```

**Response:**
```json
{
  "hand_id": 1,
  "winners": [1],
  "pot_size": 200,
  "winnings_by_player": {
    "1": 160,
    "2": -40
  },
  "best_hands": {
    "1": "Pair of Aces",
    "2": "King high"
  }
}
```

#### GET /hands
Retrieve all completed hands for the hand log.

**Response:**
```json
[
  {
    "id": 1,
    "players_count": 2,
    "pot_size": 200,
    "winners": [1],
    "board_cards": "2h3d4c5s6h",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### GET /hands/{hand_id}
Retrieve a specific hand by ID.

### Card Format

Cards are represented as 2-character strings:
- **Ranks**: 2, 3, 4, 5, 6, 7, 8, 9, T (Ten), J (Jack), Q (Queen), K (King), A (Ace)
- **Suits**: h (hearts), d (diamonds), c (clubs), s (spades)
- **Examples**: "Ah" (Ace of hearts), "Ks" (King of spades), "2c" (Two of clubs)

**Hole cards**: "AhKs" (2 cards)
**Board cards**: "2h3d4c5s6h" (5 cards for flop, turn, river)

## Testing

Run the test suite:

```bash
# Using Poetry
poetry run pytest

# With coverage
poetry run pytest --cov=app

# Run specific test file
poetry run pytest tests/test_hands.py -v
```

## Database Schema

### hands table
```sql
CREATE TABLE hands (
    id SERIAL PRIMARY KEY,
    players_data JSONB NOT NULL,
    board_cards VARCHAR(20) NOT NULL,
    pot_size INTEGER NOT NULL,
    small_blind INTEGER NOT NULL DEFAULT 20,
    big_blind INTEGER NOT NULL DEFAULT 40,
    results JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Code Style

The project follows PEP8 standards. Use tools like `black` and `flake8` for formatting and linting:

```bash
poetry add --group dev black flake8
poetry run black .
poetry run flake8 .
```

### Adding New Features

1. Create/update data models in `app/models/`
2. Implement repository methods in `app/repositories/`
3. Add business logic in `app/services/`
4. Create API endpoints in `main.py`
5. Write tests in `tests/`

## Architecture

The application follows a clean architecture pattern:

- **Models**: Data classes using `@dataclass` decorator and Pydantic models for API validation
- **Repository**: Data access layer using raw SQL queries with PostgreSQL
- **Service**: Business logic layer handling poker-specific calculations
- **API**: FastAPI endpoints with dependency injection

## Dependencies

- **FastAPI**: Modern, fast web framework for building APIs
- **pokerkit**: Poker hand evaluation and game logic
- **psycopg2-binary**: PostgreSQL adapter for Python
- **pydantic**: Data validation using Python type annotations
- **pytest**: Testing framework
- **uvicorn**: ASGI server for FastAPI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.