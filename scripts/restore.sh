#!/usr/bin/env bash
# ==========================================
# Scout System - Encrypted Restore Script
# Restores database from encrypted backup file
# ==========================================
set -e

ENCRYPTED_FILE="$1"

if [ -z "${ENCRYPTED_FILE}" ]; then
  echo "Usage: ./scripts/restore.sh <path_to_encrypted_backup_file>"
  exit 1
fi

if [ ! -f "${ENCRYPTED_FILE}" ]; then
  echo "❌ Error: Backup file not found: ${ENCRYPTED_FILE}"
  exit 1
fi

DECRYPTED_TAR="${ENCRYPTED_FILE%.enc}.tar.gz"

echo "🔓 [1/4] Decrypting backup file..."
docker compose -f docker-compose.prod.yml exec -T backend python -c "
from apps.common.services.crypto import decrypt_file
decrypt_file('${ENCRYPTED_FILE}', '${DECRYPTED_TAR}')
"

echo "📂 [2/4] Extracting SQL dump..."
tar -xzf "${DECRYPTED_TAR}" -C "backups/"

SQL_DUMP=$(find backups -name "dump_*.sql" | sort | tail -n 1)

echo "🗄️ [3/4] Restoring PostgreSQL from ${SQL_DUMP}..."
docker compose -f docker-compose.prod.yml exec -T db psql -U scout_admin scout_db < "${SQL_DUMP}"

echo "🧹 [4/4] Cleaning temporary decrypted files..."
rm -f "${DECRYPTED_TAR}" "${SQL_DUMP}"

echo "✅ Database restored successfully!"
