-- Database: TalentAssessAIDB

DROP DATABASE IF EXISTS postgres;

CREATE DATABASE "TalentAssessAIDB"
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

COMMENT ON DATABASE "TalentAssessAIDB"
    IS 'TalentAssess AI recruitment and assessment platform database';

\c "TalentAssessAIDB";

--open Command Prompt as Administrator
--Close your current Command Prompt window.

--Press the Windows Key on your keyboard.

--Type x64 Native Tools Command Prompt for VS (or cmd).
--C:\>git clone https://github.com/pgvector/pgvector.git
--C:\>cd pgvector
--C:\pgvector>set "PGROOT=C:\Program Files\PostgreSQL\17"
--C:\pgvector>nmake /F Makefile.win
--C:\pgvector>nmake /F Makefile.win install (if error close & open cmd with run as administrator then execute cmd)

-- Enable Vector Extension (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;
--Query returned successfully in 872 msec.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Content Ingestion Sources
CREATE TABLE content_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- 'pdf', 'docx', 'ppt', 'image', 'text', 'topic'
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(512),
    raw_text TEXT,
    meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Chunks & Embeddings (RAG)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_source_id UUID REFERENCES content_sources(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536), -- Standard size for OpenAI text-embedding-3-small
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Question Sets
CREATE TABLE question_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    total_questions INT NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    total_marks INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Individual Questions
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
    question_type VARCHAR(50) NOT NULL, -- 'mcq', 'true_false', 'fill_in_blank', 'short_answer', 'long_answer', 'scenario'
    question_text TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb, -- Array of strings for MCQs
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty VARCHAR(50),
    blooms_taxonomy VARCHAR(50),
    topic VARCHAR(100),
    estimated_time_seconds INT,
    marks INT DEFAULT 1,
    confidence_score FLOAT
);

-- 6. Assessment Attempts
CREATE TABLE assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,
    total_score FLOAT DEFAULT 0.0,
    percentage FLOAT DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'in_progress' -- 'in_progress', 'completed'
);

-- 7. Assessment Responses & Evaluation
CREATE TABLE user_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    score_obtained FLOAT DEFAULT 0.0,
    evaluation_breakdown JSONB DEFAULT '{}'::jsonb, -- Accuracy, Completeness, Relevance, etc.
    feedback TEXT,
    missing_concepts JSONB DEFAULT '[]'::jsonb,
    improvement_suggestions JSONB DEFAULT '[]'::jsonb,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Final Performance Reports
CREATE TABLE performance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID UNIQUE REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    weak_areas JSONB DEFAULT '[]'::jsonb,
    strong_areas JSONB DEFAULT '[]'::jsonb,
    skill_analysis JSONB DEFAULT '{}'::jsonb,
    ai_recommendations JSONB DEFAULT '[]'::jsonb,
    suggested_learning_path JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    organization_name VARCHAR,
    role VARCHAR DEFAULT 'recruiter' NOT NULL,
    must_reset_password BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'recruiter' NOT NULL;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS jd_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    organization_name VARCHAR,
    filename VARCHAR,
    role_or_topic TEXT,
    extracted_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS jd_uploads ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS recruiter_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitation_id INTEGER REFERENCES assessment_invitations(id) ON DELETE SET NULL,
    report_id INTEGER REFERENCES candidate_evaluation_reports(id) ON DELETE SET NULL,
    type VARCHAR DEFAULT 'assessment_submitted',
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    candidate_name VARCHAR,
    candidate_email VARCHAR,
    job_title VARCHAR,
    score_percentage FLOAT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

DROP TABLE IF EXISTS recruiter_notifications; DROP TABLE IF EXISTS assessment_invitations; DROP TABLE IF EXISTS candidate_evaluation_reports; DROP TABLE IF EXISTS assessment_generations; DROP TABLE IF EXISTS job_match_results; DROP TABLE IF EXISTS candidate_resumes; DROP TABLE IF EXISTS jd_uploads; DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS evaluation_reports; DROP TABLE IF EXISTS question_generations;
DROP TABLE IF EXISTS content_ingestions;