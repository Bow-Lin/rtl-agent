# Current Task

## Goal

Repair the guarded-commit finding so an I2C coverage run records its actual configured Agent
iteration budget in the persisted Core Loop run profile.

## Current Status

Implementation is complete. `runI2cCoverageExperiment` now writes `maxAgentIterations` into
`run.request.profile.maxAttempts` instead of the former fixed value 3. The shared run-profile
contract can represent 1–10 attempts, matching the I2C CLI range, while ordinary generation and
VerilogEval coverage profiles retain their existing operational maximum of three.

## Validation

- `corepack pnpm install --frozen-lockfile`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm typecheck`: passed
- focused contracts/I2C/CLI suite: 3 files and 42 tests passed
- `corepack pnpm test`: 38 files passed / 1 skipped; 294 tests passed / 2 skipped
- `corepack pnpm build`: passed
- `corepack pnpm format:check`: passed after formatting the changed contract file
- `corepack pnpm peers check`: passed

No model call, RTL edit, simulation, coverage run, or persisted runtime-evidence mutation was
performed.

## Next Boundary

Complete the guarded `commit-main` review, run the repository validation matrix, and land the
reviewed accumulated change set on `master` if no P1/P2 findings remain.

## Last Updated

2026-08-04T17:39:58+08:00
