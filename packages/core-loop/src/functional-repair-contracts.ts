import { LogicalPathSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { RunIdSchema } from "./contracts.js";

export const FunctionalSimulationFeedbackSchema = z.strictObject({
  schemaVersion: z.literal(1),
  runId: RunIdSchema,
  attempt: z.int().positive(),
  repairIteration: z.int().nonnegative(),
  mismatches: z.int().positive(),
  samples: z.int().positive(),
  outputMismatches: z
    .array(
      z.strictObject({
        outputPort: z.string().regex(/^[A-Za-z_][A-Za-z0-9_$]*$/u),
        mismatches: z.int().positive(),
        firstMismatchTime: z.int().nonnegative(),
      }),
    )
    .max(512),
  instruction: z.literal(
    "Repair the candidate RTL against spec.md using only this public mismatch summary, then leave the updated RTL under rtl/.",
  ),
});

export const CandidateFunctionalValidationSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("ACCEPT") }),
  z.strictObject({
    status: z.literal("MISMATCH"),
    feedbackPath: LogicalPathSchema.refine(
      (value) => value.startsWith("context/"),
      "Functional feedback must stay below context/",
    ),
  }),
]);

export type FunctionalSimulationFeedback = z.infer<typeof FunctionalSimulationFeedbackSchema>;
export type CandidateFunctionalValidation = z.infer<typeof CandidateFunctionalValidationSchema>;
