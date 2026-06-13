UPDATE "webshop_products"
SET
  "base_price_minor" = "base_price_minor" * 100,
  "compare_at_price_minor" = CASE
    WHEN "compare_at_price_minor" IS NULL THEN NULL
    ELSE "compare_at_price_minor" * 100
  END;

UPDATE "webshop_product_variants"
SET
  "price_minor" = CASE
    WHEN "price_minor" IS NULL THEN NULL
    ELSE "price_minor" * 100
  END,
  "compare_at_price_minor" = CASE
    WHEN "compare_at_price_minor" IS NULL THEN NULL
    ELSE "compare_at_price_minor" * 100
  END;
