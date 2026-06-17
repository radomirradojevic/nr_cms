-- Safety pass for prices that were scaled more than once by the legacy
-- data-only price migration before the runner stopped reapplying it.
UPDATE "webshop_products"
SET
  "base_price_minor" = CASE
    WHEN "base_price_minor" >= 100000000 THEN "base_price_minor" / 100
    ELSE "base_price_minor"
  END,
  "compare_at_price_minor" = CASE
    WHEN "compare_at_price_minor" IS NULL THEN NULL
    WHEN "compare_at_price_minor" >= 100000000 THEN "compare_at_price_minor" / 100
    ELSE "compare_at_price_minor"
  END
WHERE
  "base_price_minor" >= 100000000
  OR "compare_at_price_minor" >= 100000000;

UPDATE "webshop_product_variants"
SET
  "price_minor" = CASE
    WHEN "price_minor" IS NULL THEN NULL
    WHEN "price_minor" >= 100000000 THEN "price_minor" / 100
    ELSE "price_minor"
  END,
  "compare_at_price_minor" = CASE
    WHEN "compare_at_price_minor" IS NULL THEN NULL
    WHEN "compare_at_price_minor" >= 100000000 THEN "compare_at_price_minor" / 100
    ELSE "compare_at_price_minor"
  END
WHERE
  "price_minor" >= 100000000
  OR "compare_at_price_minor" >= 100000000;
