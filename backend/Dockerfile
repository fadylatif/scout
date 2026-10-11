# ==========================================
# Scout System - Backend Dockerfile
# Python 3.12-slim based on Debian Bookworm
# ==========================================
FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

# Install system dependencies for WeasyPrint, Pango, Cairo, libmagic, PostgreSQL and FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmagic1 \
    ffmpeg \
    pango1.0-tools \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY backend/requirements/base.txt /app/requirements/base.txt
COPY backend/requirements/prod.txt /app/requirements/prod.txt
RUN pip install --upgrade pip && \
    pip install -r /app/requirements/prod.txt

# Copy backend code
COPY backend/ /app/

# Create media, static, and backup directories
RUN mkdir -p /app/staticfiles /app/media /app/backups

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120"]
