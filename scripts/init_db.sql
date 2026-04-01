-- Run once on database creation
-- Enables the pgvector extension for future embedding/RAG support

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
