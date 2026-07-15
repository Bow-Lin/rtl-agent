import { z } from "zod";

import {
  ReviewIdSchema,
  Sha256DigestSchema,
  StateVersionSchema,
  TaskIdSchema,
} from "./identifiers.js";

export const ReviewTypeSchema = z.enum([
  "SPEC_APPROVAL",
  "VERIFICATION_APPROVAL",
  "VERIFICATION_CHALLENGE",
  "REGRESSION_APPROVAL",
]);
export const ReviewStatusSchema = z.enum(["PENDING", "DECIDED", "EXPIRED", "CANCELLED"]);
export const ReviewDecisionSchema = z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES"]);

export const AllowedReviewDecisionsSchema = z
  .array(ReviewDecisionSchema)
  .min(1)
  .max(3)
  .superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", message: "Review decisions must be unique" });
    }
  });

const ReviewIdentityBindingSchema = {
  taskId: TaskIdSchema,
  reviewId: ReviewIdSchema,
  stateVersion: StateVersionSchema,
};

export const SpecApprovalReviewSchema = z.strictObject({
  reviewType: z.literal("SPEC_APPROVAL"),
  allowedDecisions: AllowedReviewDecisionsSchema,
  binding: z.strictObject({
    ...ReviewIdentityBindingSchema,
    specDigest: Sha256DigestSchema,
  }),
});

export const VerificationApprovalReviewSchema = z.strictObject({
  reviewType: z.literal("VERIFICATION_APPROVAL"),
  allowedDecisions: AllowedReviewDecisionsSchema,
  binding: z.strictObject({
    ...ReviewIdentityBindingSchema,
    snapshotDigest: Sha256DigestSchema,
    verificationManifestDigest: Sha256DigestSchema,
  }),
});

export const VerificationChallengeReviewSchema = z.strictObject({
  reviewType: z.literal("VERIFICATION_CHALLENGE"),
  allowedDecisions: AllowedReviewDecisionsSchema,
  binding: z.strictObject({
    ...ReviewIdentityBindingSchema,
    snapshotDigest: Sha256DigestSchema,
    gateInputDigest: Sha256DigestSchema,
  }),
});

export const RegressionApprovalReviewSchema = z.strictObject({
  reviewType: z.literal("REGRESSION_APPROVAL"),
  allowedDecisions: AllowedReviewDecisionsSchema,
  binding: z.strictObject({
    ...ReviewIdentityBindingSchema,
    snapshotDigest: Sha256DigestSchema,
    gateInputDigest: Sha256DigestSchema,
  }),
});

export const ReviewRequestSchema = z.discriminatedUnion("reviewType", [
  SpecApprovalReviewSchema,
  VerificationApprovalReviewSchema,
  VerificationChallengeReviewSchema,
  RegressionApprovalReviewSchema,
]);

export type ReviewType = z.infer<typeof ReviewTypeSchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
export type ReviewBinding = ReviewRequest["binding"];
