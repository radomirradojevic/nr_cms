ALTER TABLE "webshop_addon_entitlements" DROP CONSTRAINT IF EXISTS "webshop_addon_entitlements_provider_check";
--> statement-breakpoint
ALTER TABLE "webshop_addon_entitlements" ADD CONSTRAINT "webshop_addon_entitlements_provider_check" CHECK ("webshop_addon_entitlements"."provider" IS NULL OR "webshop_addon_entitlements"."provider" IN ('vercel','self_hosted'));
--> statement-breakpoint
ALTER TABLE "webshop_addon_entitlements" DROP CONSTRAINT IF EXISTS "webshop_addon_entitlements_environment_check";
--> statement-breakpoint
ALTER TABLE "webshop_addon_entitlements" ADD CONSTRAINT "webshop_addon_entitlements_environment_check" CHECK ("webshop_addon_entitlements"."deployment_environment" IS NULL OR "webshop_addon_entitlements"."deployment_environment" IN ('production','self_hosted'));
