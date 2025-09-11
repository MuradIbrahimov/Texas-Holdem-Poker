echo "🔍 Running PEP8 compliance check..."
poetry run flake8 app/ --max-line-length=100 --ignore=E501,W503

echo "🧪 Running backend tests..."
poetry run pytest tests/ -v

echo "✅ Tests complete!"