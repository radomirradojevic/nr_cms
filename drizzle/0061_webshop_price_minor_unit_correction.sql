-- Correct prices that were already stored as minor units before the legacy
-- 0057 multiplier ran. Keep normal minor-unit amounts, such as 4500000 for
-- 45,000.00 RSD, untouched.
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
