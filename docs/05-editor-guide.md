# 05 Editor guide

**For:** editors and admins who add and check content in `/admin`.

## The golden rules

1. **Unknown is empty, never 0.** If you don't know a price, leave it blank. Budget lines
   without a cost need a reason ("Awaiting sourced quote").
2. **Every number needs a date and a source.** Add the source under *Sources and evidence*.
3. **Say what you checked.** Record each check separately (contact, registration,
   address...) with your evidence. Never describe something as just "verified".
4. **Label claims.** If a promoter says "30% returns", record it as a *Promoter claim*,
   not a fact.
5. **Official text and our explanation stay apart.** In guides, official steps are plain
   lines; your tips start with `*`. Practical notes go in *BizSphere practical notes*.

## Adding content

1. **Admin → Add content** and choose the directory.
2. Fill in **Basics**: the name, a short description and a category. If the category isn't in the list, type it into
   *Not in the list? Add a new category*; it is added when you save.
3. Fill in the directory's details. Leave unknown fields empty. Yes/No questions have an *Unknown* option; use it.
   Optional groups are folded: click one to open it.
4. **Publishing**:
   - *Status*: **Draft** while you work, **Waiting for review** for a second editor, **Live on the website** when ready.
   - *Who sees the full details?*: **Members only; everyone sees a preview** (the usual choice), **Everyone, free**, or **Members only, with no preview**.
5. **Advanced settings** are folded, and you can usually leave them alone: the web address, review dates
   (suggested next review: prices 30 days, funding 60 days, guides 120 days, suppliers 12 months), audiences,
   business stages, the districts the item *applies to* (not where the provider is based), and links to other
   pages: one link per line, `relationship page-address`. Example for a business idea:
   ```
   needs_machine deck-baking-oven-2-decks
   fits_funding sample-sme-equipment-loan
   uses_recipe basic-white-bread-batch
   expert_help sample-business-plan-consultant
   ```
   The page address is the last part of its URL. Links show on both pages.
6. **Save**. Every save is kept in the revision history. When editing, you can say what changed under *Advanced settings*.

## Suppliers

The supplier form asks only for what the supplier page shows: name, what they sell, contact details, address and
photo. After saving, add their products in the table on the same page. **Edit** on a row opens that product.
A catalogue download, branches and extra contacts are under **More options**.

**Supplier products** (`/admin/seller-products`) lists every supplier's products in one table. Products a seller adds
or changes wait there under *Waiting for approval* until someone approves them. **Hide** takes a product off the website.

## Categories (`/admin/categories`)

Add a category, or change a name and press **Save**: the page address stays the same, so links keep working. A category
can only be deleted when nothing uses it.

## Subscription prices (`/admin/plans`)

Suppliers and experts pay for 6 months, 1, 2 or 3 years. Members pay by the day, week, month or year. Empty a box to stop
offering that length. People who have already paid keep the time they paid for.

## Line formats

| Box | One line each | Example |
|---|---|---|
| Business idea steps | `Title \| description` | `Confirm demand \| Visit nearby shops and schools` |
| Guide steps | the instruction; start with `*` for a BizSphere tip | `* Bring photocopies, the office has no copier` |
| Guide documents | `Name \| notes` | `National ID \| original and copy` |
| Recipe ingredients | `quantity \| unit \| name \| preparation \| substitute` | `2 \| kg \| Wheat flour \| sifted` · ` \| \| Salt \| to taste` |
| Recipe method | `instruction \| minutes \| °C` | `Bake until golden \| 25 \| 200` |
| Budget lines | `category \| description \| qty \| unit \| unit cost \| reason if unknown \| recurring` | `Premises \| Rent \| 3 \| month \| \| Awaiting quote \| yes` |

Lists such as allergens, languages and specialties are comma-separated.

## After saving: the edit page

- **Startup budget scenarios** (business ideas): low, standard and higher. Give each an
  estimate date and location. The public total appears only when every line has a cost.
- **Application rounds** (funding): opening and closing dates (East Africa Time), the
  application link and required documents. The daily job opens and closes rounds by date.
- **Sources and evidence**: add each source and what it supports. A source with the same
  link is reused across pages.
- **Verification checks**: choose the check, the result and your evidence (who you spoke
  to, what you saw, when). Only passed checks show publicly, each with its date.

## Review queue (`/admin/review`)

Business sign-ups, machine offers and market prices wait here. Open one, record the
checks you made, then **Approve**, **Request changes** or **Reject**. A note is required
unless you approve. The business sees your decision as an alert.

## Reported mistakes (`/admin/corrections`)

Readers report problems from any page. Check the claim against the source first.
**Accept** marks the page as due for review now, so it appears in the overdue filter; then
fix the page. **Reject** with a note. Signed-in reporters are told the outcome.

## Market prices (`/admin/prices`)

- Add markets and products first. Give each product a *standard unit* (e.g. `50 kg bag`).
- Each observation needs the date observed, the price type and the unit quoted. Prices
  are only compared across markets when the unit matches the product's standard unit.
- Tick **Publish now** only if you checked the evidence yourself; otherwise it goes to the review queue.
- Never edit an old price. Add a new observation; history is the point.

## Keeping content fresh

**All content** has freshness filters: *Review due in 30 days* and *Overdue*. Select items
and **Send for re-review** or **Archive**. Content past its *Expires* date is archived
automatically each night.
