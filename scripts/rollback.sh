#!/usr/bin/env bash
# ==========================================
# Scout System - Quick Rollback Script
# Reverts to previous Git commit and restarts services
# ==========================================
set -e

echo "⚠️ Initiating emergency rollback..."

# 1. Rollback to previous commit
git reset --hard HEAD~1

# 2. Rebuild and restart services
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 3. Check health
curl -f http://localhost:8000/api/health/ || { echo "❌ Rollback health check failed!"; exit 1; }

echo "✅ Rollback completed successfully!"
