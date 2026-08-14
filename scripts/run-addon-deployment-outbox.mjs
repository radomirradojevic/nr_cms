import "dotenv/config";

const deploymentOutboxModule =
  await import("../lib/addon-runtime/deployment-outbox.ts");
const deploymentOutbox =
  deploymentOutboxModule.default ?? deploymentOutboxModule;
const dispatchOneAddonDeploymentOutbox =
  deploymentOutbox.dispatchOneAddonDeploymentOutbox;

if (typeof dispatchOneAddonDeploymentOutbox !== "function") {
  throw new Error("deployment_outbox_dispatcher_export_missing");
}

if (!process.argv.slice(2).includes("--once")) {
  throw new Error(
    "Use --once. A long-lived deployment worker service is introduced only in Prompt 08.",
  );
}
const result = await dispatchOneAddonDeploymentOutbox();
console.log(JSON.stringify({ outcome: result.outcome }));
