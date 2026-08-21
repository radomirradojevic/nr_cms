import { readAddonServingStateV1 } from "@/data/addon-serving-state";

export async function readWebshopServingStateV1() {
  return readAddonServingStateV1("webshop");
}
