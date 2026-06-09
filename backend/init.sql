-- WebChat Operation Platform - Database Schema Phase 1

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(255),
    hashed_password TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    is_admin        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Agent servers registry
CREATE TABLE IF NOT EXISTS agent_servers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    host        VARCHAR(255) NOT NULL,
    port        INTEGER NOT NULL DEFAULT 5001,
    api_key     TEXT,
    os_type     VARCHAR(20) DEFAULT 'linux',
    shell_type  VARCHAR(20) DEFAULT 'bash',
    is_active   BOOLEAN DEFAULT TRUE,
    last_seen   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
    content         TEXT NOT NULL,
    command_payload JSONB,
    exec_result     JSONB,
    exec_status     VARCHAR(20) CHECK (exec_status IN ('pending','confirmed','executed','failed','cancelled')),
    agent_server_id UUID REFERENCES agent_servers(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user    ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_servers_active  ON agent_servers(is_active);

-- Seed: sample agent servers
INSERT INTO agent_servers (name, description, host, port, os_type, shell_type, api_key)
VALUES
    ('server-linux-01', 'Production Linux Server 01', '192.168.1.10', 5001, 'linux',   'bash',       'agent-key-linux-01'),
    ('server-win-01',   'Windows Application Server', '192.168.1.20', 5001, 'windows', 'powershell', 'agent-key-win-01')
ON CONFLICT DO NOTHING;

-- NOTE: Không seed password tại đây.
-- Sau khi chạy init.sql, chạy lệnh sau để tạo user admin:
--   python reset_password.py --user admin --password Admin@123
