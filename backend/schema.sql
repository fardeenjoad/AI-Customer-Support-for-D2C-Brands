-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create BRANDS table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL UNIQUE,
    faqs JSONB DEFAULT '[]'::jsonb,
    tone TEXT DEFAULT 'formal',
    email_config JSONB DEFAULT '{}'::jsonb,
    custom_greeting TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create USERS table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'agent', 'customer')),
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create AGENT_BRANDS join table (required for agent scoping)
CREATE TABLE IF NOT EXISTS agent_brands (
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, brand_id)
);

-- 4. Create TICKETS table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    intent TEXT DEFAULT 'general' CHECK (intent IN ('complaint', 'query', 'refund', 'general')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create MESSAGES table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('customer', 'ai', 'agent')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 6. Create FEEDBACK table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed Initial Test Brand
INSERT INTO brands (id, brand_name, faqs, tone, email_config, custom_greeting)
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'EcoStyle',
    '[
        {"question": "What is your return policy?", "answer": "We offer a 30-day return policy for all unused products in their original packaging."},
        {"question": "How long does shipping take?", "answer": "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days."},
        {"question": "Are your materials organic?", "answer": "Yes! All EcoStyle products are made from 100% certified organic cotton and recycled materials."}
    ]'::jsonb,
    'friendly, warm, eco-conscious, professional',
    '{
        "ticket_created": {
            "subject": "We received your request - Ticket #{ticket_id}",
            "body": "Hi {customer_name},\n\nThanks for reaching out to EcoStyle support. We have created a support ticket #{ticket_id} for you. Our team is looking into it!\n\nSubject: {subject}\n\nBest regards,\nEcoStyle Team"
        },
        "ticket_resolved": {
            "subject": "Your support ticket #{ticket_id} is resolved",
            "body": "Hi {customer_name},\n\nWe have marked your ticket #{ticket_id} as resolved.\n\nPlease rate your experience: {rating_link}\n\nBest regards,\nEcoStyle Team"
        },
        "agent_assigned": {
            "subject": "New Ticket Assigned - #{ticket_id}",
            "body": "Hi Agent,\n\nYou have been assigned ticket #{ticket_id}.\n\nSubject: {subject}\nLink: http://localhost:8000/admin/tickets/{ticket_id}"
        }
    }'::jsonb,
    'Hello! Welcome to EcoStyle Support. How can we help you sustain style today?'
)
ON CONFLICT (brand_name) DO UPDATE 
SET faqs = EXCLUDED.faqs, tone = EXCLUDED.tone, email_config = EXCLUDED.email_config, custom_greeting = EXCLUDED.custom_greeting;

-- Seed Users (Password for all seeded accounts: "password123")
INSERT INTO users (id, email, hashed_password, role, brand_id)
VALUES 
    ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'admin@ecostyle.com', '$2a$12$K8aQ6ZzP8v6fB3LwE6a2eO2c6m69c9h1a5A2e8tB4c3d2e1fG5h7i', 'admin', NULL),
    ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'agent@ecostyle.com', '$2a$12$K8aQ6ZzP8v6fB3LwE6a2eO2c6m69c9h1a5A2e8tB4c3d2e1fG5h7i', 'agent', NULL),
    ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'customer@gmail.com', '$2a$12$K8aQ6ZzP8v6fB3LwE6a2eO2c6m69c9h1a5A2e8tB4c3d2e1fG5h7i', 'customer', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
ON CONFLICT (email) DO NOTHING;

-- Map Agent to Brand
INSERT INTO agent_brands (agent_id, brand_id)
VALUES ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
ON CONFLICT DO NOTHING;

-- Production optimization indexes
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_brand_id ON tickets(brand_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_feedback_ticket_id ON feedback(ticket_id);

