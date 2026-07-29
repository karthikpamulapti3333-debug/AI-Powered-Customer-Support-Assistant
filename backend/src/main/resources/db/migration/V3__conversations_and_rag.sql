-- Migration V3: Add Conversations, RAG KB, Knowledge Gaps, and Audit Logging
-- Compatible with MySQL 8.x and H2 (MySQL Mode)

-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, COMPLAINT_CREATED, RESOLVED, CLOSED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_role VARCHAR(50) NOT NULL, -- CUSTOMER, AI, AGENT
    message_text TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT FALSE,
    sentiment VARCHAR(50),
    confidence DOUBLE,
    intent VARCHAR(100),
    priority VARCHAR(50),
    escalation_risk DOUBLE,
    requires_human BOOLEAN DEFAULT FALSE,
    sources TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 3. Conversation Analysis Table
CREATE TABLE IF NOT EXISTS conversation_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL UNIQUE,
    summary TEXT,
    intent VARCHAR(100),
    sentiment VARCHAR(100),
    priority VARCHAR(100),
    escalation_risk DOUBLE,
    root_cause VARCHAR(255),
    recommended_actions TEXT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 4. Knowledge Documents Table
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT,
    category VARCHAR(100) DEFAULT 'GENERAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Knowledge Chunks Table
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT NOT NULL,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
);

-- 6. Knowledge Gaps Table
CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    query_text VARCHAR(255) NOT NULL,
    reason VARCHAR(255), -- LOW_CONFIDENCE, NO_DOC_FOUND, UNHELPFUL_FEEDBACK, HUMAN_INTERVENT
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id BIGINT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Alter complaints table to link to conversations
ALTER TABLE complaints ADD COLUMN conversation_id BIGINT NULL;
ALTER TABLE complaints ADD CONSTRAINT fk_complaint_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;

-- Indexes for performance queries
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_knowledge_gaps_resolved ON knowledge_gaps(resolved);
CREATE INDEX idx_complaints_conversation ON complaints(conversation_id);
