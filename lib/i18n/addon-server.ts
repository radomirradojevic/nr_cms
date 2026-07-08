import "server-only";

import { getGlobalSettings } from "@/data/global-settings";
import {
  buildAddonI18nContext,
  type AddonI18nContext,
} from "@/lib/i18n/addon-contract";

export async function getAddonI18nContext(): Promise<AddonI18nContext> {
  return buildAddonI18nContext(await getGlobalSettings());
}
