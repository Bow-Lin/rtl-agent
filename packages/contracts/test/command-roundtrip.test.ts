import { describe, expect, it } from "vitest";

import {
  ActorSchema,
  CommandEnvelopeSchema,
  RequestReviewCommandSchema,
  canonicalizeJsonJcs,
  parseCommandEnvelope,
} from "../src/index.js";
import { DIGEST, OTHER_TASK_ID, REVIEW_ID, TASK_ID, startWorkflowEnvelope } from "./fixtures.js";

describe("command contracts", () => {
  it("strict-parses and round-trips a command envelope", () => {
    const parsed = CommandEnvelopeSchema.parse(startWorkflowEnvelope());
    const roundTripped = JSON.parse(canonicalizeJsonJcs(parsed)) as unknown;
    expect(CommandEnvelopeSchema.parse(roundTripped)).toEqual(parsed);
  });

  it("rejects unknown fields", () => {
    const input = { ...startWorkflowEnvelope(), secret: "must not pass" };
    expect(CommandEnvelopeSchema.safeParse(input).success).toBe(false);
  });

  it("uses constrained actor variants", () => {
    expect(ActorSchema.safeParse({ type: "SYSTEM", id: "workflow-daemon" }).success).toBe(true);
    expect(ActorSchema.safeParse({ type: "SYSTEM", id: "root" }).success).toBe(false);
    expect(ActorSchema.safeParse({ type: "AGENT", id: "bad actor" }).success).toBe(false);
  });

  it("requires exact review-type bindings and matching identities", () => {
    const valid = {
      type: "REQUEST_REVIEW",
      taskId: TASK_ID,
      reviewId: REVIEW_ID,
      reviewType: "SPEC_APPROVAL",
      allowedDecisions: ["APPROVE", "REQUEST_CHANGES"],
      binding: { taskId: TASK_ID, reviewId: REVIEW_ID, stateVersion: 1, specDigest: DIGEST },
    };
    expect(RequestReviewCommandSchema.safeParse(valid).success).toBe(true);
    expect(
      RequestReviewCommandSchema.safeParse({
        ...valid,
        binding: { ...valid.binding, taskId: OTHER_TASK_ID },
      }).success,
    ).toBe(false);
    expect(
      RequestReviewCommandSchema.safeParse({
        ...valid,
        allowedDecisions: ["APPROVE", "APPROVE"],
      }).success,
    ).toBe(false);
    expect(
      RequestReviewCommandSchema.safeParse({
        ...valid,
        binding: { ...valid.binding, snapshotDigest: DIGEST },
      }).success,
    ).toBe(false);
  });

  it("round-trips every Phase A command discriminator", () => {
    const requestReview = {
      type: "REQUEST_REVIEW",
      taskId: TASK_ID,
      reviewId: REVIEW_ID,
      reviewType: "SPEC_APPROVAL",
      allowedDecisions: ["APPROVE", "REJECT"],
      binding: { taskId: TASK_ID, reviewId: REVIEW_ID, stateVersion: 1, specDigest: DIGEST },
    };
    const commands = [
      startWorkflowEnvelope().command,
      requestReview,
      { type: "RECORD_REVIEW_DECISION", taskId: TASK_ID, reviewId: REVIEW_ID, decision: "APPROVE" },
    ];
    for (const command of commands) {
      const envelope = { ...startWorkflowEnvelope(), expectedStateVersion: 1, command };
      expect(CommandEnvelopeSchema.parse(JSON.parse(JSON.stringify(envelope)) as unknown)).toEqual(
        envelope,
      );
    }
  });

  it("classifies version, discriminator, identifier, and path failures", () => {
    expect(parseCommandEnvelope({ ...startWorkflowEnvelope(), schemaVersion: 2 })).toMatchObject({
      success: false,
      error: { code: "UNSUPPORTED_SCHEMA_VERSION" },
    });
    const missingVersion = startWorkflowEnvelope() as Record<string, unknown>;
    delete missingVersion.schemaVersion;
    expect(parseCommandEnvelope(missingVersion)).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR", issues: [{ kind: "REQUIRED" }] },
    });
    expect(
      parseCommandEnvelope({
        ...startWorkflowEnvelope(),
        command: { ...startWorkflowEnvelope().command, type: "DELETE_EVERYTHING" },
      }),
    ).toMatchObject({ success: false, error: { code: "UNKNOWN_COMMAND" } });
    expect(
      parseCommandEnvelope({
        ...startWorkflowEnvelope(),
        command: { ...startWorkflowEnvelope().command, taskId: "bad" },
      }),
    ).toMatchObject({ success: false, error: { code: "INVALID_IDENTIFIER" } });
    expect(
      parseCommandEnvelope({
        ...startWorkflowEnvelope(),
        command: { ...startWorkflowEnvelope().command, specPath: "../secret" },
      }),
    ).toMatchObject({ success: false, error: { code: "INVALID_LOGICAL_PATH" } });
  });
});
