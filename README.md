# Texas Hold'em Poker Simulator

A full-stack Texas Hold'em poker simulator with hand evaluation and history tracking.

## Features

- 6-player Texas Hold'em gameplay
- Full betting rounds (preflop, flop, turn, river)
- Automatic hand evaluation using pokerkit
- Persistent hand history with PostgreSQL
- Real-time UI updates
- Docker containerization for easy deployment

## Tech Stack

### Frontend
- Next.js 14 with TypeScript
- React 18
- Zustand for state management
- Tailwind CSS for styling
- Jest for testing

### Backend
- FastAPI (Python)
- PostgreSQL database
- Pokerkit for hand evaluation
- Poetry for dependency management
- Repository pattern with raw SQL

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd poker-app

# Start all services
docker compose up -d

# Wait ~30 seconds for services to initialize
# Open browser to http://localhost:3000
```

### Manual Setup

#### Backend
```bash
cd backend
poetry install
poetry run python app/main.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Database
Ensure PostgreSQL is running with:
- Database: poker_db
- User: poker_user
- Password: poker_password

## Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd backend
poetry run pytest
```


## Project Structure

```
.
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── PokerTable.tsx    # Main game component
│   │   │   └── HandHistory.tsx   # Hand history display
│   │   ├── store/
│   │   │   └── gameStore.ts      # Game state management
│   │   └── __tests__/
│   │       └── gameStore.test.ts # Frontend tests
│   ├── Dockerfile
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI application
│   │   ├── database.py           # Database connection
│   │   ├── models/               # Data models
│   │   ├── repositories/         # Data access layer
│   │   └── services/             # Business logic
│   ├── tests/                    # Backend tests
│   ├── pyproject.toml            # Poetry configuration
│   └── Dockerfile
└── database/
    └── init.sql                  # Database initialization

```

## API Endpoints

- `GET /` - Health check
- `GET /hands` - Retrieve hand history
- `POST /hands` - Process and save a completed hand

## Game Rules

- 6 players maximum
- Small blind: 20 chips
- Big blind: 40 chips
- No ante
- Standard Texas Hold'em betting rounds

## Hand History Format

Each completed hand is displayed with:
1. UUID - Unique identifier
2. Stack info - Player stacks and positions (BTN/SB/BB)
3. Hole cards - Each player's cards
4. Action sequence - Short format (f=fold, x=check, c=call, b40=bet 40, etc.)
5. Winnings - Final profit/loss for each player

## Troubleshooting

### Docker Issues
```bash
# Clean restart
docker compose down -v
docker compose up -d --build
```

### Database Connection
Ensure PostgreSQL is accessible on port 5432 and credentials match docker-compose.yml

### Frontend Not Loading
Check that backend is running on http://localhost:8000

## License

MIT
