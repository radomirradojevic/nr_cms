import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const VARIABLES = [
  [
    "NR_CMS_DEPLOYMENT_PROFILE",
    "CMS deployment identity: development, vendor, or client.",
  ],
  [
    "NR_LICENSE_ENVIRONMENT",
    "License contract environment: development, staging, or production.",
  ],
  [
    "NR_ADDON_SOURCE_MODE",
    "Add-on source policy: private_workspace, registry, or empty.",
  ],
  [
    "NR_CMS_RELEASE_SHA",
    "Exact 40-character lowercase CMS source commit served by this runtime.",
  ],
  ["DATABASE_URL", "PostgreSQL connection used by the CMS."],
  [
    "NEXT_PUBLIC_APP_URL",
    "Public canonical CMS origin; local development uses http://localhost:3000.",
  ],
  [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "Public Clerk key used for browser authentication.",
  ],
  [
    "CLERK_SECRET_KEY",
    "Server-only Clerk key; it must never be sent to the browser.",
  ],
  [
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "Public Cloudflare Turnstile site key for forms and comments.",
  ],
  [
    "TURNSTILE_SECRET_KEY",
    "Server-only Cloudflare Turnstile key used to verify tokens.",
  ],
  ["EMAIL_PROVIDER", "Active email transport, such as resend or smtp."],
  ["RESEND_API_KEY", "Resend API key when EMAIL_PROVIDER=resend."],
  ["EMAIL_FROM", "Default From address for transactional email."],
  ["IP_HASH_SALT", "Dedicated salt for one-way hashing of IP addresses."],
  [
    "CRON_SECRET",
    "Single shared secret for every CMS cron route and scheduler.",
  ],
  [
    "STORAGE_PROVIDER",
    "Active file-storage adapter: local disk or Vercel Blob.",
  ],
  [
    "UPLOADS_DIR",
    "Upload directory when the active storage provider is local.",
  ],
  ["WEBSHOP_ENABLED", "Master switch for the Webshop add-on and its routes."],
  [
    "WEBSHOP_STOREFRONT_ENABLED",
    "Controls whether the public Webshop storefront is available.",
  ],
  [
    "WEBSHOP_CHECKOUT_ENABLED",
    "Controls whether new checkout sessions may be created.",
  ],
  [
    "WEBSHOP_INSTALL_MODE",
    "Webshop package installation policy: disabled or managed_redeploy.",
  ],
  [
    "WEBSHOP_DEPLOYMENT_MODE",
    "Webshop deployment identity: self_hosted or vercel.",
  ],
  ["WEBSHOP_PAYMENTS_MODE", "Webshop payment environment: test or live."],
  [
    "WEBSHOP_COOKIE_SECURE",
    "Explicit Secure policy for the Webshop cart cookie.",
  ],
  [
    "WEBSHOP_CART_TOKEN_SALT",
    "Dedicated salt used to hash Webshop cart tokens.",
  ],
  [
    "WEBSHOP_DOWNLOAD_TOKEN_SECRET",
    "Signs short-lived digital download tokens.",
  ],
  [
    "WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET",
    "Hashes sensitive identifiers in download audit events.",
  ],
  [
    "WEBSHOP_LICENSE_SERVER_SECRET_KEY",
    "Encrypts external License Server credentials stored by the Webshop.",
  ],
  [
    "WEBSHOP_BANK_REDIRECT_WEBHOOK_SECRET",
    "Verifies bank-redirect payment callback signatures.",
  ],
  ["WEBSHOP_BUY_URL", "Public sales page used to purchase a Webshop license."],
  [
    "WEBSHOP_BUY_LINK_SECRET",
    "Signs the time-limited domain payload in a Webshop purchase link.",
  ],
  [
    "LICENSE_SERVER_ENABLED",
    "Master switch for the customer-owned License Server add-on.",
  ],
  [
    "LICENSE_SERVER_INSTALL_MODE",
    "License Server package installation policy: disabled or managed_redeploy.",
  ],
  [
    "LICENSE_SERVER_DEPLOYMENT_MODE",
    "License Server deployment identity: self_hosted or vercel.",
  ],
  [
    "LICENSE_SERVER_CUSTOMER_ENVIRONMENT",
    "Scope environment for licenses issued by the customer License Server.",
  ],
  [
    "LICENSE_SERVER_SECRET_KEY",
    "Encrypts API client shared secrets for the License Server add-on.",
  ],
  [
    "LICENSE_SERVER_BUY_URL",
    "Public sales page used to purchase a License Server add-on license.",
  ],
  [
    "LICENSE_SERVER_BUY_LINK_SECRET",
    "Signs the time-limited domain payload in a License Server purchase link.",
  ],
  [
    "NR_MASTER_LICENSE_URL",
    "Single master endpoint for paid add-on activation and revalidation.",
  ],
  [
    "NR_ADDON_INSTALLATION_ENCRYPTION_KEY",
    "Encrypts the private identity key for this CMS installation.",
  ],
  [
    "NR_ALLOW_INSECURE_LOOPBACK_HTTP",
    "Allows HTTP only for loopback services during local development.",
  ],
  [
    "NRLS_ALLOWED_OUTBOUND_HOSTS",
    "Allowlist of hosts that license and Webshop transports may contact.",
  ],
  [
    "NRLS_ALLOW_SELF_HOSTED_OUTBOUND",
    "Explicitly permits additional self-hosted outbound destinations.",
  ],
];

const COMMENT_BY_KEY = new Map(VARIABLES);
const SECTIONS = [
  {
    description:
      "Shared infrastructure and paid add-on activation for client and vendor CMS installations.",
    keys: [
      "NR_CMS_DEPLOYMENT_PROFILE",
      "NR_LICENSE_ENVIRONMENT",
      "NR_ADDON_SOURCE_MODE",
      "NR_CMS_RELEASE_SHA",
      "DATABASE_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "CLERK_SECRET_KEY",
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      "TURNSTILE_SECRET_KEY",
      "EMAIL_PROVIDER",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "IP_HASH_SALT",
      "CRON_SECRET",
      "STORAGE_PROVIDER",
      "UPLOADS_DIR",
      "NR_MASTER_LICENSE_URL",
      "NR_ADDON_INSTALLATION_ENCRYPTION_KEY",
      "NR_ALLOW_INSECURE_LOOPBACK_HTTP",
      "NRLS_ALLOWED_OUTBOUND_HOSTS",
      "NRLS_ALLOW_SELF_HOSTED_OUTBOUND",
    ],
    title: "COMMON CORE VARIABLES - CLIENT AND VENDOR CMS",
  },
  {
    description:
      "Shared Webshop add-on contract; values differ between client and vendor installations.",
    keys: [
      "WEBSHOP_ENABLED",
      "WEBSHOP_STOREFRONT_ENABLED",
      "WEBSHOP_CHECKOUT_ENABLED",
      "WEBSHOP_INSTALL_MODE",
      "WEBSHOP_DEPLOYMENT_MODE",
      "WEBSHOP_PAYMENTS_MODE",
      "WEBSHOP_COOKIE_SECURE",
      "WEBSHOP_CART_TOKEN_SALT",
      "WEBSHOP_DOWNLOAD_TOKEN_SECRET",
      "WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET",
      "WEBSHOP_LICENSE_SERVER_SECRET_KEY",
      "WEBSHOP_BUY_URL",
      "WEBSHOP_BUY_LINK_SECRET",
    ],
    title: "COMMON WEBSHOP ADD-ON VARIABLES - CLIENT AND VENDOR CMS",
  },
  {
    description:
      "Shared customer-owned issuer contract; this is not the ls.nrcms.com master service.",
    keys: [
      "LICENSE_SERVER_ENABLED",
      "LICENSE_SERVER_INSTALL_MODE",
      "LICENSE_SERVER_DEPLOYMENT_MODE",
      "LICENSE_SERVER_CUSTOMER_ENVIRONMENT",
      "LICENSE_SERVER_SECRET_KEY",
      "LICENSE_SERVER_BUY_URL",
      "LICENSE_SERVER_BUY_LINK_SECRET",
    ],
    title: "COMMON LICENSE-SERVER ADD-ON VARIABLES - CLIENT AND VENDOR CMS",
  },
  {
    description:
      "Internal nrcms.com rollout and payment callback settings that client CMS installations do not require.",
    keys: [
      "WEBSHOP_BANK_REDIRECT_WEBHOOK_SECRET",
    ],
    title: "NRCMS.COM VENDOR CMS ONLY",
  },
];
const ORDERED_VARIABLES = SECTIONS.flatMap(({ keys }) =>
  keys.map((key) => [key, COMMENT_BY_KEY.get(key)]),
);

const REMOVED_KEYS = new Set([
  "ADDON_INSTALL_RECONCILIATION_V1",
  "ADDON_SDK_V1",
  "APP_URL",
  "CLERK_WEBHOOK_SECRET",
  "CONTENT_PUBLISHING_SCHEDULER_INTERVAL_SECONDS",
  "LICENSE_SERVER_ENTITLEMENT_CRON_SECRET",
  "LICENSE_SERVER_REDEPLOY_AUTH_KID",
  "LICENSE_SERVER_REDEPLOY_AUTH_SECRET",
  "LICENSE_SERVER_REDEPLOY_WEBHOOK_URL",
  "WEBSHOP_ENTITLEMENT_CRON_SECRET",
  "WEBSHOP_LICENSE_ISSUE_CRON_SECRET",
  "WEBSHOP_PADDLE_API_KEY",
  "WEBSHOP_PADDLE_CLIENT_TOKEN",
  "WEBSHOP_PADDLE_WEBHOOK_SECRET",
  "WEBSHOP_PAYPAL_CLIENT_ID",
  "WEBSHOP_PAYPAL_CLIENT_SECRET",
  "WEBSHOP_PAYPAL_WEBHOOK_ID",
  "WEBSHOP_REDEPLOY_AUTH_KID",
  "WEBSHOP_REDEPLOY_AUTH_SECRET",
  "WEBSHOP_REDEPLOY_WEBHOOK_URL",
  "WEBSHOP_STRIPE_SECRET_KEY",
  "WEBSHOP_STRIPE_WEBHOOK_SECRET",
  "WEBSHOP_PAYMENT_STATE_V2",
  "WEBSHOP_LICENSE_OUTBOX_V2",
  "VENDOR_LICENSE_API_V2",
]);

const envPath = resolve(process.cwd(), ".env");
const current = await readFile(envPath, "utf8");
const assignments = new Map();

for (const line of current.split(/\r?\n/)) {
  const match = line.match(
    /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/,
  );
  if (!match) continue;
  const [, key, value] = match;
  if (assignments.has(key)) {
    throw new Error(`Duplicate local runtime variable: ${key}`);
  }
  assignments.set(key, `${key}=${value}`);
}

if (process.argv.includes("--rotate-cron")) {
  assignments.set(
    "CRON_SECRET",
    `CRON_SECRET=${randomBytes(32).toString("base64url")}`,
  );
}
if (process.argv.includes("--rotate-bank-webhook")) {
  assignments.set(
    "WEBSHOP_BANK_REDIRECT_WEBHOOK_SECRET",
    `WEBSHOP_BANK_REDIRECT_WEBHOOK_SECRET=${randomBytes(32).toString("base64url")}`,
  );
}
assignments.set(
  "LICENSE_SERVER_CUSTOMER_ENVIRONMENT",
  "LICENSE_SERVER_CUSTOMER_ENVIRONMENT=development",
);

const orderedKeys = new Set(ORDERED_VARIABLES.map(([key]) => key));
const unknownKeys = [...assignments.keys()].filter(
  (key) => !orderedKeys.has(key) && !REMOVED_KEYS.has(key),
);
if (unknownKeys.length) {
  throw new Error(
    `Refusing to remove undocumented runtime variables: ${unknownKeys.join(", ")}`,
  );
}

const missingKeys = ORDERED_VARIABLES.map(([key]) => key).filter(
  (key) => !assignments.has(key),
);
if (missingKeys.length) {
  throw new Error(
    `Missing required runtime variables: ${missingKeys.join(", ")}`,
  );
}

const output = `${SECTIONS.map(({ description, keys, title }) =>
  [
    "# ============================================================================",
    `# ${title}`,
    `# ${description}`,
    "# ============================================================================",
    "",
    ...keys.flatMap((key) => [
      `# ${COMMENT_BY_KEY.get(key)}`,
      assignments.get(key),
      "",
    ]),
  ]
    .join("\r\n")
    .trimEnd(),
).join("\r\n\r\n")}\r\n`;

await writeFile(envPath, output, "utf8");
console.log(
  `Cleaned local runtime environment: ${ORDERED_VARIABLES.length} documented variables in ${SECTIONS.length} sections, ${REMOVED_KEYS.size} obsolete or inactive variables removed.`,
);
