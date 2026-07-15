import type { Actor, Command, ReviewDecision, Stage, TaskStatus } from "@rtl-agent/contracts";

export type TransitionStateKey = "MISSING" | `${Stage}/${TaskStatus}`;

export const PHASE_A_TRANSITION_TABLE = {
  START_WORKFLOW: ["MISSING"],
  REQUEST_REVIEW: ["SPEC_FREEZE/ACTIVE"],
  RECORD_REVIEW_DECISION: ["SPEC_FREEZE/WAITING_REVIEW"],
} as const satisfies Record<Command["type"], readonly TransitionStateKey[]>;

export const COMMAND_ACTOR_POLICY = {
  START_WORKFLOW: ["USER", "AGENT"],
  REQUEST_REVIEW: ["AGENT", "SYSTEM"],
  RECORD_REVIEW_DECISION: ["USER"],
} as const satisfies Record<Command["type"], readonly Actor["type"][]>;

export const SPEC_APPROVAL_DECISIONS = [
  "APPROVE",
  "REJECT",
  "REQUEST_CHANGES",
] as const satisfies readonly ReviewDecision[];

export function transitionStateKey(
  stage: Stage | null,
  status: TaskStatus | null,
): TransitionStateKey {
  return stage === null || status === null ? "MISSING" : `${stage}/${status}`;
}

export function isCommandAllowed(commandType: Command["type"], state: TransitionStateKey): boolean {
  return (PHASE_A_TRANSITION_TABLE[commandType] as readonly TransitionStateKey[]).includes(state);
}

export function isActorAllowed(commandType: Command["type"], actorType: Actor["type"]): boolean {
  return (COMMAND_ACTOR_POLICY[commandType] as readonly Actor["type"][]).includes(actorType);
}

export function hasSpecApprovalDecisionPolicy(values: readonly ReviewDecision[]): boolean {
  return (
    values.length === SPEC_APPROVAL_DECISIONS.length &&
    SPEC_APPROVAL_DECISIONS.every((decision) => values.includes(decision))
  );
}
