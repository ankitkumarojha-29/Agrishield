FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for GeoAlchemy, Shapely, PyProj, and asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgeos-dev \
    libproj-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads

# Google Cloud Run dynamically injects the PORT environment variable (default: 8080)
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start FastAPI application using uvicorn
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
