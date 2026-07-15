import { describe, expect, it } from "vitest";

import { decide } from "../src/index.js";
import {
  EVENT_IDS,
  TIMES,
  deepFreeze,
  decisionContext,
  requestReviewCommand,
  startedState,
} from "./fixtures.js";

describe("determinism and immutability", () => {
  it("returns deeply equal decisions for identical frozen inputs", () => {
    const state = deepFreeze(structuredClone(startedState()));
    const command = deepFreeze(structuredClone(requestReviewCommand()));
    const context = deepFreeze(decisionContext(EVENT_IDS[1], TIMES[1]));
    const stateBefore = structuredClone(state);
    const commandBefore = structuredClone(command);
    const contextBefore = structuredClone(context);

    const first = decide(state, command, context);
    const second = decide(state, command, context);
    expect(first).toEqual(second);
    expect(state).toEqual(stateBefore);
    expect(command).toEqual(commandBefore);
    expect(context).toEqual(contextBefore);
  });
});
