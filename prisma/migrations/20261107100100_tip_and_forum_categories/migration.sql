-- Starter categories for Business Tips and the Business Forum, so the forms have choices from day one.
-- In their own migration: a new enum value can't be used in the migration that adds it.
-- Rename, add or delete them at Admin > Categories.
INSERT INTO "categories" ("id", "name", "slug", "kind")
SELECT md5(v.kind || '-' || v.slug), v.name, v.slug, v.kind::"CategoryKind"
FROM (VALUES
  ('TIP_CATEGORY', 'Starting a business', 'starting-a-business'),
  ('TIP_CATEGORY', 'Money and records', 'money-and-records'),
  ('TIP_CATEGORY', 'Marketing and sales', 'marketing-and-sales'),
  ('TIP_CATEGORY', 'Customers', 'customers'),
  ('TIP_CATEGORY', 'Staff and management', 'staff-and-management'),
  ('TIP_CATEGORY', 'Tax and registration', 'tax-and-registration'),
  ('FORUM_CATEGORY', 'General', 'general'),
  ('FORUM_CATEGORY', 'Starting a business', 'starting-a-business'),
  ('FORUM_CATEGORY', 'Funding and money', 'funding-and-money'),
  ('FORUM_CATEGORY', 'Suppliers and stock', 'suppliers-and-stock'),
  ('FORUM_CATEGORY', 'Marketing and sales', 'marketing-and-sales'),
  ('FORUM_CATEGORY', 'Tax and registration', 'tax-and-registration')
) AS v(kind, name, slug)
ON CONFLICT ("kind", "slug") DO NOTHING;
