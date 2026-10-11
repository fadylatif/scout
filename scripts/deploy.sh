#!/usr/bin/env bash
# ==========================================
# Scout System - Production Deployment Script
# ==========================================
set -e

echo "🚀 Starting Scout System Deployment on Hostinger VPS..."

# 1. Pull latest code from private repository
echo "📥 Pulling latest git changes..."
git pull origin main

# 2. Build and update docker containers
echo "🐳 Building Docker images..."
docker compose -f docker-compose.prod.yml build

# 3. Start infrastructure and backend
echo "🔄 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# 4. Run database migrations
echo "🗄️ Running PostgreSQL migrations..."
docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput

# 5. Collect static assets
echo "🎨 Collecting static files..."
docker compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

# 6. Verify health endpoint
echo "🩺 Verifying API health check..."
curl -f http://localhost:8000/api/health/ || { echo "❌ Health check failed!"; exit 1; }

echo "✅ Scout System Deployment Completed Successfully!"
