export {
  ADDON_INSTALL_PROGRESS_STAGES as WEBSHOP_INSTALL_PROGRESS_STAGES,
  isAddonInstallProgressResponse as isWebshopInstallProgressResponse,
  resolveAddonInstallProgressStage as resolveWebshopInstallProgressStage,
} from "@/lib/addon-runtime/install-progress";

export type {
  AddonInstallProgressResponse as WebshopInstallProgressResponse,
  AddonInstallProgressStage as WebshopInstallProgressStage,
} from "@/lib/addon-runtime/install-progress";
