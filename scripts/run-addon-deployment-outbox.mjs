import "dotenv/config";
import { dispatchOneAddonDeploymentOutbox } from "../lib/addon-runtime/deployment-outbox.ts";

if (!process.argv.slice(2).includes("--once")) {
  throw new Error("Use --once. A long-lived deployment worker service is introduced only in Prompt 08.");
}
const result = await dispatchOneAddonDeploymentOutbox();
console.log(JSON.stringify({ outcome: result.outcome }));
