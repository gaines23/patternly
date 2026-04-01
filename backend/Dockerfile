FROM python:3.12-slim

# System deps
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Don't write .pyc, don't buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt requirements-dev.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements-dev.txt

# Copy source (volume mount overrides in dev)
COPY . .

EXPOSE 8000
