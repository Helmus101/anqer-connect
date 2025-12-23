---
description: Full end-to-end technical workflow for contact deep enrichment using Google Search and DeepSeek AI.
---

# SYSTEM OVERVIEW

**Goal:**
Given a contact, automatically discover and enrich the *correct* online identity using Google search → URL following → cross-signal verification → confidence scoring → profile memory.

**Core principle:**
Google is only for discovery.
**URLs are the source of truth.**

---

# DATA MODEL (CORE TABLES)

### Contact
- id, user_id, name, email, phone, company, location, created_at

### Anchor
- id, contact_id, type (email | company | location | social_url), value, confidence

---

# FULL WORKFLOW (STEP BY STEP)

## 1. Contact Import / Anchor Extraction
- Extract Anchors: Email domain, Company, Location, Social URL.

## 2. Enrichment Trigger
- Triggered on new contact or new anchor.

## 3. Query Construction
- `"${name}" "${company}"`
- `"${name}" "@${domain}"`
- `"${name}" "${location}"`

## 4. Google Search (Discovery)
- Fetch top 5 results per query.
- Discovery Phase only.

## 5. URL Pre-Filter
- Allow: linkedin, github, twitter, instagram, personal domains, company about pages.
- Discard: aggregators.

## 6. URL Fetch & Parsing (Source of Truth)
- **CRITICAL**: Fetch HTML, Parse with Cheerio/similar.
- Extract: Name, Role, Company, Location, Bio.
- Ignore Google snippets.

## 7. AI Verification & Extraction (DeepSeek)
- Use DeepSeek AI to analyze fetched content.
- Cross-reference with anchors.
- Score confidence.

## 8. Update Contact
- If confidence > Threshold: Update contact profile (Job, Bio, Socials, Interests).
- Tag interests as "verified" or "inferred".

