-- Seed Data for ResolveAI Schema
-- Compatible with MySQL 8.x and H2 (MySQL Mode)

-- 1. Insert Roles
INSERT INTO roles (id, name) VALUES (1, 'ROLE_ADMIN');
INSERT INTO roles (id, name) VALUES (2, 'ROLE_MANAGER');
INSERT INTO roles (id, name) VALUES (3, 'ROLE_AGENT');
INSERT INTO roles (id, name) VALUES (4, 'ROLE_CUSTOMER');

-- 2. Insert Departments
INSERT INTO departments (id, name, description) VALUES (1, 'Billing & Payments', 'Handles invoice queries, billing errors, payment failures, and refunds.');
INSERT INTO departments (id, name, description) VALUES (2, 'Logistics & Delivery', 'Handles shipping delays, incorrect shipping details, carrier issues, and packaging.');
INSERT INTO departments (id, name, description) VALUES (3, 'Product Quality & Support', 'Handles defective items, missing parts, product specs, and warranty claims.');
INSERT INTO departments (id, name, description) VALUES (4, 'Account Security', 'Handles hacked accounts, unauthorized activities, MFA issues, and login blocks.');
INSERT INTO departments (id, name, description) VALUES (5, 'Technical Operations', 'Handles website bugs, app failures, server downtime, and API issues.');
INSERT INTO departments (id, name, description) VALUES (6, 'General Support', 'Handles basic feedback, customer service reviews, and other general queries.');

-- 3. Insert Users
-- Admin (password: admin123)
INSERT INTO users (id, username, password, email, first_name, last_name, department_id) 
VALUES (1, 'admin', '$2b$12$n8g3AtxjT/EkuTwPrLJbl.tnof5KJtTz6HHikXdLu/2xRyESrwjYS', 'admin@resolveai.com', 'System', 'Administrator', NULL);

-- Manager (password: manager123)
INSERT INTO users (id, username, password, email, first_name, last_name, department_id) 
VALUES (2, 'manager', '$2b$12$DcpgV.wnszjlhjyk0yG.Pe3Q/O6fiDatYnb8XXnt0lHCJwpf9FIxi', 'manager@resolveai.com', 'Support', 'Manager', NULL);

-- Agent Billing (password: agent123)
INSERT INTO users (id, username, password, email, first_name, last_name, department_id) 
VALUES (3, 'agent_billing', '$2b$12$9Ar6aiLXDGAr.94jcgPrC.dt4JtYM7IkyTaxReVFyEVdGHxpATNGe', 'agent.billing@resolveai.com', 'Sarah', 'Billing', 1);

-- Agent Logistics (password: agent123)
INSERT INTO users (id, username, password, email, first_name, last_name, department_id) 
VALUES (4, 'agent_logistics', '$2b$12$9Ar6aiLXDGAr.94jcgPrC.dt4JtYM7IkyTaxReVFyEVdGHxpATNGe', 'agent.logistics@resolveai.com', 'John', 'Logistics', 2);

-- Agent Technical (password: agent123)
INSERT INTO users (id, username, password, email, first_name, last_name, department_id) 
VALUES (5, 'agent_technical', '$2b$12$9Ar6aiLXDGAr.94jcgPrC.dt4JtYM7IkyTaxReVFyEVdGHxpATNGe', 'agent.technical@resolveai.com', 'Alex', 'Tech', 5);

-- Customer (password: customer123)
INSERT INTO users (id, username, password, email, first_name, last_name, department_id) 
VALUES (6, 'customer', '$2b$12$N4qyw6t0ms.qEszjcUf6iOsI3EzaDDysdWQcSXDYFXNQqihSf0ugG', 'customer@gmail.com', 'Jane', 'Doe', NULL);

-- 4. User Roles Mapping
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1); -- admin -> ROLE_ADMIN
INSERT INTO user_roles (user_id, role_id) VALUES (1, 2); -- admin -> ROLE_MANAGER
INSERT INTO user_roles (user_id, role_id) VALUES (2, 2); -- manager -> ROLE_MANAGER
INSERT INTO user_roles (user_id, role_id) VALUES (3, 3); -- agent_billing -> ROLE_AGENT
INSERT INTO user_roles (user_id, role_id) VALUES (4, 3); -- agent_logistics -> ROLE_AGENT
INSERT INTO user_roles (user_id, role_id) VALUES (5, 3); -- agent_technical -> ROLE_AGENT
INSERT INTO user_roles (user_id, role_id) VALUES (6, 4); -- customer -> ROLE_CUSTOMER

-- 5. Insert Agents Workload Status
INSERT INTO agents (id, user_id, department_id, status, max_concurrent_complaints, current_complaints_count)
VALUES (1, 3, 1, 'AVAILABLE', 5, 0); -- Sarah
INSERT INTO agents (id, user_id, department_id, status, max_concurrent_complaints, current_complaints_count)
VALUES (2, 4, 2, 'AVAILABLE', 5, 0); -- John
INSERT INTO agents (id, user_id, department_id, status, max_concurrent_complaints, current_complaints_count)
VALUES (3, 5, 5, 'AVAILABLE', 5, 0); -- Alex

-- 6. Insert Complaint Categories
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (1, 'PAYMENT', 'Billing & Payments', 'Transaction issues, failed payments, billing discrepancies.');
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (2, 'DELIVERY', 'Logistics & Delivery', 'Shipping delays, damaged packages, lost items.');
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (3, 'PRODUCT', 'Product Quality', 'Defective or broken products, item not as described.');
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (4, 'ACCOUNT', 'Account Management', 'Settings, profiles, subscription settings.');
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (5, 'TECHNICAL', 'Technical Failures', 'Website/App glitches, system errors, login problems.');
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (6, 'REFUND', 'Refunds & Returns', 'Refund status, return labels, credit request.');
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (7, 'SERVICE', 'Customer Service', 'Agent behavior, delayed responses, service complaints.');
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (8, 'SECURITY', 'Account Security', 'Hacking, phising, unauthorized transactions, password reset issues.');
INSERT INTO complaint_categories (id, name, display_name, description) VALUES (9, 'OTHER', 'Miscellaneous', 'Anything else not covered by other categories.');

-- 7. Insert SLA Rules
INSERT INTO sla_rules (id, priority, resolution_time_hours, warning_time_hours) VALUES (1, 'LOW', 72, 48);
INSERT INTO sla_rules (id, priority, resolution_time_hours, warning_time_hours) VALUES (2, 'MEDIUM', 48, 24);
INSERT INTO sla_rules (id, priority, resolution_time_hours, warning_time_hours) VALUES (3, 'HIGH', 24, 12);
INSERT INTO sla_rules (id, priority, resolution_time_hours, warning_time_hours) VALUES (4, 'CRITICAL', 4, 2);

-- 8. Insert Recommended Solutions (Knowledge base)
INSERT INTO recommended_solutions (id, title, description, category, intent, root_cause, resolution_steps) VALUES (
1, 
'Failed Payment Gateway Check', 
'Resolving payments that failed but debited funds', 
'PAYMENT', 
'PAYMENT_FAILED', 
'PAYMENT_GATEWAY_FAILURE', 
'1. Check Stripe/Paypal logs with transaction reference.\n2. Confirm if funds are captured or pending/voided.\n3. If captured but order not created, manually create order or issue immediate refund.\n4. Inform customer about bank reconciliation timeline (5-7 business days).'
);

INSERT INTO recommended_solutions (id, title, description, category, intent, root_cause, resolution_steps) VALUES (
2, 
'Delayed Shipment Investigation', 
'Tracking and pushing stuck orders in logistics', 
'DELIVERY', 
'ORDER_DELAY', 
'LOGISTICS_DELAY', 
'1. Query DHL/FedEx API for latest dispatch milestones.\n2. Open an escalation ticket with the courier agent.\n3. Contact carrier warehouse if package is stuck in customs.\n4. Send a formal delay notice to customer with revised delivery schedule and a shipping discount voucher.'
);

INSERT INTO recommended_solutions (id, title, description, category, intent, root_cause, resolution_steps) VALUES (
3, 
'Defective Product Quality Check', 
'Process for handling returns of damaged or non-working products', 
'PRODUCT', 
'DAMAGED_PRODUCT', 
'DAMAGED_IN_TRANSIT', 
'1. Request photos/videos of the damaged item and packaging.\n2. Verify purchase details and check warranty state.\n3. Approve pre-paid return shipping label.\n4. Ship out new replacement unit immediately or issue full refund upon return shipment tracking update.'
);

INSERT INTO recommended_solutions (id, title, description, category, intent, root_cause, resolution_steps) VALUES (
4, 
'Locked Account Verification and Reset', 
'Unlocking accounts locked due to repeated failed login attempts', 
'ACCOUNT', 
'ACCOUNT_LOCKED', 
'CREDENTIALS_ISSUE', 
'1. Confirm customer identity via security question or email confirmation.\n2. Clear failed attempts counter in database (users table).\n3. Trigger automated password reset email to user.\n4. Advise user to update their credentials and use MFA.'
);

INSERT INTO recommended_solutions (id, title, description, category, intent, root_cause, resolution_steps) VALUES (
5, 
'Login Failure Debugging', 
'Steps to resolve technical website login issues', 
'TECHNICAL', 
'LOGIN_PROBLEM', 
'TECHNICAL_FAILURE', 
'1. Instruct customer to clear browser cache or use Incognito mode.\n2. Verify user account state is active (not deleted or disabled).\n3. Check backend server authentication logs for expired tokens.\n4. Guide customer to use the correct domain login portal.'
);

INSERT INTO recommended_solutions (id, title, description, category, intent, root_cause, resolution_steps) VALUES (
6, 
'Suspicious Account Login Attempt', 
'Securing compromised accounts after security alert', 
'SECURITY', 
'SECURITY_ISSUE', 
'ACCOUNT_COMPROMISED', 
'1. Block user sessions immediately in DB and terminate active JWTs.\n2. Set user status to locked/security_review.\n3. Trigger identity verification email.\n4. Upon validation, guide user to change password and re-authenticate all authorized devices.'
);
