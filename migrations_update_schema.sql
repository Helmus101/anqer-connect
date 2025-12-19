-- Run this in the Supabase SQL Editor to fix the Profile Editing issues

-- 1. Add the missing 'bio' column
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS bio text;

-- 2. Ensure social_links exists (just in case)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;

-- 3. Ensure address exists
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address text;
