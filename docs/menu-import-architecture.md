# Hull Eats Hub Menu Import Architecture

## MVP structure

- `1 hub = 1 live store` for v1
- Admin creates the hub from the internal admin panel
- The merchant hub is the only place that can create or edit categories, items, prices, stock, and images
- The customer marketplace stays read-only for menu data

## Menu creation paths

There are three simple menu-entry paths in the merchant hub:

1. Manual quick add
   - Create a category
   - Add items into that category
   - Use a normal `Meal Deals` category instead of a special deal builder for MVP

2. Paste storefront text
   - Merchant pastes copied menu text into the import box
   - The backend splits the text into category and item candidates
   - Prices are parsed where possible
   - Nothing goes live yet

3. Upload menu image
   - Merchant uploads a menu page image
   - The system creates candidate items for review
   - Nothing goes live yet

## Review-first rule

Both import methods use the same review pipeline:

- import creates a pending batch
- batch contains suggested categories, item names, prices, and source lines
- merchant ticks the correct candidates
- accepted candidates are applied into the live hub menu
- rejected candidates are simply left out

This keeps onboarding fast without publishing bad data straight to customers.

## Current implementation

- Manual category and item creation is working in the merchant hub
- Pasted menu text now creates pending review candidates
- Image upload now goes through the same pending-review batch flow
- Image extraction is still mocked for now

## Next implementation step

To make image import production-ready, add an async extraction pipeline:

1. Upload image to storage
2. Create import batch record
3. Queue OCR/extraction job
4. Parse OCR output into candidate categories/items/prices
5. Return reviewed candidates back to the merchant hub

## Persistence model

The internal system now stores:

- hubs
- hub users
- hub settings
- menu sections
- menu items
- import batches
- import candidates
- accepted menu changes after review

This flow is now database-backed through the API, so hub users, menu changes, and pending imports survive API restarts. The next production step is replacing the mocked image extraction with a real OCR/parser pipeline.
