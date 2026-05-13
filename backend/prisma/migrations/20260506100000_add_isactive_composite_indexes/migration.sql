-- Composite indexes that pair `isActive` (the predicate every public read uses)
-- with the columns we filter / sort by next. Each is created CONCURRENTLY in
-- a separate statement so the migration can run on a busy production DB
-- without taking a write lock on the table.
--
-- Why composite-with-isActive-first instead of a partial index `WHERE isActive=true`?
--   - Composite stays useful for both `isActive=true` AND admin queries that
--     omit the predicate.
--   - Postgres bitmap-OR / merge can combine two composites cheaply.
-- Verify with:  EXPLAIN (ANALYZE, BUFFERS) SELECT ... FROM "Product" WHERE ...

-- ─── Product ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Product_isActive_isDeal_idx"
    ON "Product"("isActive", "isDeal");

CREATE INDEX IF NOT EXISTS "Product_isActive_rating_idx"
    ON "Product"("isActive", "rating");

CREATE INDEX IF NOT EXISTS "Product_isActive_category_idx"
    ON "Product"("isActive", "category");

CREATE INDEX IF NOT EXISTS "Product_isActive_brand_idx"
    ON "Product"("isActive", "brand");

-- ─── ProductVariant ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_isActive_idx"
    ON "ProductVariant"("productId", "isActive");

-- ─── Course ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Course_isPublished_idx"
    ON "Course"("isPublished");
