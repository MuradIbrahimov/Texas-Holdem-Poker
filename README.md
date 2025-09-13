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
poker-app/
├── docker-compose.yml           # Multi-service orchestration
├── .gitignore                   # Git ignore patterns
├── README.md                    # This file
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Main page
│   │   │   ├── PokerTable.tsx  # Main game component
│   │   │   └── HandHistory.tsx # Hand history display
│   │   ├── store/
│   │   │   └── gameStore.ts    # Game state management
│   │   └── __tests__/
│   │       └── gameStore.test.ts # Frontend tests
│   ├── Dockerfile              # Frontend container config
│   ├── package.json            # Node.js dependencies
│   ├── package-lock.json       # Locked dependency versions
│   ├── next.config.js          # Next.js configuration
│   ├── tailwind.config.js      # Tailwind CSS config
│   ├── tsconfig.json           # TypeScript config
│   ├── jest.config.js          # Jest testing config
│   └── .gitignore              # Frontend-specific ignores
├── backend/
│   ├── app/
│   │   ├── __init__.py         # Package marker
│   │   ├── main.py             # FastAPI application entry
│   │   ├── database.py         # Database connection manager
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── hand.py         # Data models and API schemas
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   └── hand_repository.py # Data access layer
│   │   └── services/
│   │       ├── __init__.py
│   │       └── poker_service.py # Business logic
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_api.py         # API endpoint tests
│   │   └── test_hands.py       # Hand evaluation tests
│   ├── Dockerfile              # Backend container config
│   ├── pyproject.toml          # Poetry configuration
│   ├── poetry.lock             # Locked Python dependencies
│   ├── README.md               # Backend-specific docs
│   └── .env.example            # Environment variables template
└── database/
    └── init.sql                # Database initialization script
```

## API Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health check with database status
- `GET /hands` - Retrieve hand history
- `POST /hands` - Process and save a completed hand

## Game Rules

- 6 players maximum (6max)
- Small blind: 20 chips
- Big blind: 40 chips
- No ante
- Standard Texas Hold'em betting rounds

## Docker Configuration

### Services
- **database**: PostgreSQL 15 with health checks
- **backend**: FastAPI with hot reload in development
- **frontend**: Next.js with hot reload in development

### Ports
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Database: localhost:5432 (for external connections)

### Volumes
- `postgres_data`: Persistent database storage
- Source code volumes for hot reload during development

## Environment Variables

### Backend (.env)
```
DB_HOST=database
DB_PORT=5432
DB_NAME=poker_db
DB_USER=poker_user
DB_PASSWORD=poker_password
```

### Frontend
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Hand History Format

Each completed hand displays:
1. **UUID** - Unique hand identifier
2. **Stack Info** - Player stacks and positions (BTN/SB/BB)
3. **Hole Cards** - Each player's private cards
4. **Action Sequence** - Betting actions (f=fold, x=check, c=call, b40=bet 40)
5. **Board Cards** - Community cards (flop, turn, river)
6. **Winners** - Winning players and pot distribution

## Development Notes

- Backend uses Poetry for dependency management
- Frontend uses npm with locked package versions
- Both services support hot reload in Docker development
- Database includes health checks for reliable startup
- All services communicate via Docker network

## Troubleshooting

### Testing Issues
```bash
# If 'pytest' or 'jest' is not recognized locally:
# Use Docker instead:
docker compose exec backend poetry run pytest
docker compose exec frontend npm test

# If containers aren't running:
docker compose up -d

# If you get permission errors:
docker compose down
docker compose up --build -d
```

### Common Issues
1. **Services not starting**: Check Docker Desktop is running
2. **Database connection failed**: Wait for health check to pass (~30 seconds)
3. **Port conflicts**: Ensure ports 3000, 8000, and 5432 are available
4. **Build failures**: Try `docker compose down` then `docker compose up --build`
5. **Test commands not found**: Dependencies are in containers, use `docker compose exec`

### Logs
```bash
# View all service logs
docker compose logs

# View specific service
docker compose logs backend
docker compose logs frontend
docker compose logs database

# Follow logs in real-time
docker compose logs -f backend
```