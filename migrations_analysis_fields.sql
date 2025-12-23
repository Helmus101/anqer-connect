-- Migration to add analysis fields to contacts table if they don't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_analyzed TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_summary TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_summary TEXT;
