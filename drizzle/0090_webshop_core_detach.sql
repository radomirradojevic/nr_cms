-- Core is no longer the source of truth for Webshop business data. This
-- migration only detaches the exact empty historical public model. A
-- populated, partial, or externally-referenced model must use the operator
-- cutover CLI; this migration deliberately never uses CASCADE.
-- nr-cms:allow-destructive — reviewed empty-only core detach with no CASCADE.
DO $$
DECLARE
  expected_tables text[] := ARRAY[
    'webshop_attributes','webshop_audit_events','webshop_cart_items','webshop_carts',
    'webshop_categories','webshop_category_attribute_exclusions','webshop_category_attributes',
    'webshop_category_closure','webshop_checkout_reservations','webshop_checkout_sessions',
    'webshop_coupon_redemptions','webshop_coupons','webshop_digital_asset_files',
    'webshop_digital_assets','webshop_download_entitlements','webshop_download_events',
    'webshop_fulfillment_documents','webshop_fulfillments','webshop_license_keys',
    'webshop_license_server_catalog_items','webshop_license_server_issues',
    'webshop_license_server_operations','webshop_license_servers','webshop_order_addresses',
    'webshop_order_delivery_confirmations','webshop_order_items','webshop_orders',
    'webshop_outbox_events','webshop_payment_attempts','webshop_payment_disputes',
    'webshop_payment_events','webshop_payment_provider_references','webshop_payments',
    'webshop_product_attribute_values','webshop_product_categories','webshop_product_media',
    'webshop_product_reviews','webshop_product_variant_attribute_values',
    'webshop_product_variants','webshop_products','webshop_refund_items','webshop_refunds',
    'webshop_related_products','webshop_wishlist_items','webshop_wishlists'
  ];
  actual_tables text[];
  remaining text[] := expected_tables;
  candidate text;
  table_name text;
  has_rows boolean;
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname)
    INTO actual_tables
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind IN ('r', 'p')
     AND c.relname = ANY(expected_tables);

  IF actual_tables IS NULL OR cardinality(actual_tables) <> cardinality(expected_tables)
     OR actual_tables <> (SELECT array_agg(value ORDER BY value) FROM unnest(expected_tables) AS value) THEN
    RAISE EXCEPTION 'operator_schema_cutover_required: legacy Webshop public table set is missing or drifted';
  END IF;

  FOREACH table_name IN ARRAY expected_tables LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I LIMIT 1)', table_name) INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION 'operator_schema_cutover_required: legacy Webshop table % is populated', table_name;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
      FROM pg_constraint fk
      JOIN pg_class child ON child.oid = fk.conrelid
      JOIN pg_namespace child_schema ON child_schema.oid = child.relnamespace
      JOIN pg_class parent ON parent.oid = fk.confrelid
      JOIN pg_namespace parent_schema ON parent_schema.oid = parent.relnamespace
     WHERE fk.contype = 'f'
       AND parent_schema.nspname = 'public'
       AND parent.relname = ANY(expected_tables)
       AND child_schema.nspname = 'public'
       AND child.relname <> ALL(expected_tables)
  ) THEN
    RAISE EXCEPTION 'operator_schema_cutover_required: a non-Webshop relation references legacy Webshop data';
  END IF;

  WHILE cardinality(remaining) > 0 LOOP
    SELECT candidate_name INTO candidate
      FROM unnest(remaining) AS candidate_name
     WHERE NOT EXISTS (
       SELECT 1
         FROM pg_constraint fk
         JOIN pg_class child ON child.oid = fk.conrelid
         JOIN pg_namespace child_schema ON child_schema.oid = child.relnamespace
         JOIN pg_class parent ON parent.oid = fk.confrelid
         JOIN pg_namespace parent_schema ON parent_schema.oid = parent.relnamespace
        WHERE fk.contype = 'f'
          AND child_schema.nspname = 'public'
          AND parent_schema.nspname = 'public'
          AND child.relname = ANY(remaining)
          AND parent.relname = candidate_name
          AND child.relname <> candidate_name
     )
     ORDER BY candidate_name
     LIMIT 1;
    IF candidate IS NULL THEN
      RAISE EXCEPTION 'operator_schema_cutover_required: legacy Webshop foreign-key graph is cyclic or drifted';
    END IF;
    EXECUTE format('DROP TABLE public.%I', candidate);
    remaining := array_remove(remaining, candidate);
  END LOOP;
END;
$$;
