import { StageSchema, TaskStatusSchema } from "@rtl-agent/contracts";
import { describe, expect, it } from "vitest";

import {
  COMMAND_ACTOR_POLICY,
  PHASE_A_TRANSITION_TABLE,
  isActorAllowed,
  isCommandAllowed,
  transitionStateKey,
} from "../src/index.js";

describe("executable Phase A transition table", () => {
  it("covers every command discriminator and all Stage x Status combinations", () => {
    expect(Object.keys(PHASE_A_TRANSITION_TABLE).sort()).toEqual([
      "RECORD_REVIEW_DECISION",
      "REQUEST_REVIEW",
      "START_WORKFLOW",
    ]);

    let combinations = 0;
    for (const stage of StageSchema.options) {
      for (const status of TaskStatusSchema.options) {
        const key = transitionStateKey(stage, status);
        expect(isCommandAllowed("START_WORKFLOW", key)).toBe(false);
        expect(isCommandAllowed("REQUEST_REVIEW", key)).toBe(
          stage === "SPEC_FREEZE" && status === "ACTIVE",
        );
        expect(isCommandAllowed("RECORD_REVIEW_DECISION", key)).toBe(
          stage === "SPEC_FREEZE" && status === "WAITING_REVIEW",
        );
        combinations += 1;
      }
    }
    expect(combinations).toBe(StageSchema.options.length * TaskStatusSchema.options.length);
    expect(isCommandAllowed("START_WORKFLOW", "MISSING")).toBe(true);
  });

  it("enforces the explicit actor matrix", () => {
    expect(COMMAND_ACTOR_POLICY).toEqual({
      START_WORKFLOW: ["USER", "AGENT"],
      REQUEST_REVIEW: ["AGENT", "SYSTEM"],
      RECORD_REVIEW_DECISION: ["USER"],
    });
    expect(isActorAllowed("START_WORKFLOW", "SYSTEM")).toBe(false);
    expect(isActorAllowed("REQUEST_REVIEW", "USER")).toBe(false);
    expect(isActorAllowed("RECORD_REVIEW_DECISION", "AGENT")).toBe(false);
  });
});
