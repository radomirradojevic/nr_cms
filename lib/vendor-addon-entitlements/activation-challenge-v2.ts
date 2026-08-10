import { z } from "zod";

const developmentDomainVerificationSchema = z
  .object({
    method: z.literal("development_allowlist_exemption"),
    path: z.null(),
    required: z.literal(false),
  })
  .strict();

const httpsDomainVerificationSchema = z
  .object({
    method: z.literal("https_well_known"),
    path: z
      .string()
      .regex(/^\/\.well-known\/nr-license-domain-proof\/[0-9a-f-]{36}$/),
    required: z.literal(true),
  })
  .strict();

export const activationChallengeV2ResponseSchema = z
  .object({
    challengeId: z.string().uuid(),
    contractVersion: z.literal(2),
    domainVerification: z.discriminatedUnion("method", [
      developmentDomainVerificationSchema,
      httpsDomainVerificationSchema,
    ]),
    expiresAt: z.string().datetime(),
    hostCapabilityDescriptorHash: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/),
    ok: z.literal(true),
    signaturePayload: z.string().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.domainVerification.method === "https_well_known" &&
      value.domainVerification.path !==
        `/.well-known/nr-license-domain-proof/${value.challengeId}`
    ) {
      context.addIssue({
        code: "custom",
        message: "Activation domain-verification path is not challenge-bound.",
        path: ["domainVerification", "path"],
      });
    }
  });

export function parseActivationChallengeV2Response(value: unknown) {
  return activationChallengeV2ResponseSchema.parse(value);
}
