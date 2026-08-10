import type { ChipBenchFixtureProvider } from "./chipbench-provider.js";
import {
  FunctionalSimulationResultSchema,
  evaluateFunctionalSimulationBatch,
} from "./verilog-eval-simulation.js";
import type {
  EvaluateFunctionalSimulationOptions,
  FunctionalSimulationResult,
} from "./verilog-eval-simulation.js";

export const ChipBenchFunctionalResultSchema = FunctionalSimulationResultSchema;
export type ChipBenchFunctionalResult = FunctionalSimulationResult;

export interface EvaluateChipBenchFunctionalOptions extends Omit<
  EvaluateFunctionalSimulationOptions,
  "provider"
> {
  readonly provider: ChipBenchFixtureProvider;
}

export function evaluateChipBenchFunctionalBatch(
  options: EvaluateChipBenchFunctionalOptions,
): Promise<ChipBenchFunctionalResult> {
  return evaluateFunctionalSimulationBatch(options);
}
