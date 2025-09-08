FROM python:3.12-slim

# Set working directory
WORKDIR /app


# Install Poetry
RUN pip install poetry

# Copy poetry configuration
COPY pyproject.toml poetry.lock* ./

# Configure poetry to not create virtual environment
RUN poetry config virtualenvs.create false

# Install Python dependencies (production only)
RUN poetry install --no-root --only main

# Copy application code
COPY . .

# Set environment variables for database connection
ENV DB_HOST=database
ENV DB_PORT=5432
ENV DB_NAME=poker_db
ENV DB_USER=poker_user
ENV DB_PASSWORD=poker_password

# Expose port
EXPOSE 8000

# Default command (can be overridden by docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]