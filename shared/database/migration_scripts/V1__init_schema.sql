-- DDL Script for ResolveAI Schema
-- Compatible with MySQL 8.x and H2 (MySQL Mode)

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    department_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 4. User Roles Mapping Table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 5. Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    department_id BIGINT,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    max_concurrent_complaints INT DEFAULT 5,
    current_complaints_count INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 6. Complaint Categories Table
CREATE TABLE IF NOT EXISTS complaint_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    description VARCHAR(255)
);

-- 7. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'NEW',
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    customer_id BIGINT NOT NULL,
    category_id BIGINT,
    assigned_agent_id BIGINT,
    assigned_department_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    sla_deadline TIMESTAMP NULL,
    escalation_status VARCHAR(50) DEFAULT 'NONE',
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES complaint_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 8. Complaint Analysis Table (AI prediction records)
CREATE TABLE IF NOT EXISTS complaint_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL UNIQUE,
    category VARCHAR(100),
    intent VARCHAR(100),
    sentiment VARCHAR(100),
    priority VARCHAR(100),
    escalation_risk DOUBLE,
    root_cause VARCHAR(255),
    confidence_score DOUBLE,
    recommended_actions TEXT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

-- 9. Complaint Audit History Table
CREATE TABLE IF NOT EXISTS complaint_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL,
    changed_by_user_id BIGINT NOT NULL,
    action VARCHAR(100),
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Complaint Comments Table (Chat log)
CREATE TABLE IF NOT EXISTS complaint_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Recommended Solutions (Knowledge base)
CREATE TABLE IF NOT EXISTS recommended_solutions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    intent VARCHAR(100),
    root_cause VARCHAR(100),
    resolution_steps TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Customer Feedback Table
CREATE TABLE IF NOT EXISTS customer_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    rating INT,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    complaint_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT,
    uploaded_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. SLA Rules Table
CREATE TABLE IF NOT EXISTS sla_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    priority VARCHAR(50) NOT NULL UNIQUE,
    resolution_time_hours INT NOT NULL,
    warning_time_hours INT NOT NULL
);
