-- Add explicit social media columns to contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS snapchat TEXT;

-- Update the search_network function to include these new columns if needed (optional, can do later)
-- For now, just adding columns is sufficient for the app to work.
