-- Contact-form messages scored as spam on arrival are kept, but the team is never texted about
-- them (19 Nov 2026). They sit in Admin > Leads > Spam instead of the new-leads list.
-- IF NOT EXISTS so re-running on a database that already has the value is not an error.
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'SPAM';
