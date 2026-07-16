# Core Loop Fixture Provider Boundary

This directory reserves the repository location for future, operator-reviewed evaluation
dataset adapters. R01 intentionally contains no evaluation cases, dataset mirror, reference
answer, hidden test, or fixture catalog.

Adapters must implement `FixtureProvider` from `@rtl-agent/core-loop`. A provider receives a
fresh staging directory, writes only regular allowlisted spec/starter-RTL files there, and
returns pinned dataset and case provenance. Core Loop validation owns path checks, collision
checks, content hashing, normalization, and publication into a run workspace.

Do not commit third-party dataset content here before dataset selection, license review,
adapter review, and a versioned evaluation profile. Tests may create synthetic inputs only in
temporary directories; those inputs are mechanics tests, not evaluation evidence.
