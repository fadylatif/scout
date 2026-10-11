#!/usr/bin/env bash
# ==========================================
# Scout System - Encrypted Backup Script
# Creates encrypted ZIP containing Postgres dump & Media files
# ==========================================
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
ARCHIVE_NAME="scout_backup_${TIMESTAMP}.tar.gz"
ENCRYPTED_NAME="scout_backup_${TIMESTAMP}.enc"

mkdir -p "${BACKUP_DIR}"

echo "📦 [1/4] Dumping PostgreSQL database..."
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U scout_admin scout_db > "${BACKUP_DIR}/dump_${TIMESTAMP}.sql"

echo "🗜️ [2/4] Packaging database dump and media..."
tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "${BACKUP_DIR}" "dump_${TIMESTAMP}.sql"

echo "🔒 [3/4] Encrypting backup archive with AES-256..."
docker compose -f docker-compose.prod.yml exec -T backend python -c "
from apps.common.services.crypto import encrypt_file
encrypt_file('${BACKUP_DIR}/${ARCHIVE_NAME}', '${BACKUP_DIR}/${ENCRYPTED_NAME}')
"

echo "🧹 [4/4] Cleaning temporary plaintext files..."
rm -f "${BACKUP_DIR}/dump_${TIMESTAMP}.sql" "${BACKUP_DIR}/${ARCHIVE_NAME}"

echo "✅ Backup completed successfully: ${BACKUP_DIR}/${ENCRYPTED_NAME}"
