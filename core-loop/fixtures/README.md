# Core Loop Fixture Provider Boundary

This directory stores reviewed dataset lock metadata and adapter documentation. It does not
contain a dataset mirror, reference answer, hidden test, or generated fixture catalog.

Adapters must implement `FixtureProvider` from `@rtl-agent/core-loop`. A provider receives a
fresh staging directory, writes only regular allowlisted spec/starter-RTL files there, and
returns pinned dataset and case provenance. Core Loop validation owns path checks, collision
checks, content hashing, normalization, and publication into a run workspace.

`verilog-eval-v2.lock.json` pins the selected upstream commit, transport archive digest,
extracted-content manifest, case count, license reference, Provider source digest, and adapter
normalization identity.
The preparation command downloads only that archive, extracts only `LICENSE` and
`dataset_spec-to-rtl/**`, validates all 472 files, and publishes the content below the ignored
`.rtl-agent/datasets/` cache. The Provider exposes only public prompts to run workspaces;
reference implementations and testbenches remain outside the Agent boundary.

`chipbench.lock.json` applies the same boundary to three Verilog-generation and eight
Verilog-debugging splits. Preparation extracts only `LICENSE`, `Verilog Gen/**`, and
`Verilog Debugging/**`; the Provider derives the locked 223-case catalog from complete
prompt/reference/testbench triplets and exposes only prompts. Debugging prompts are categorized
as `PROMPTED_FUNCTIONAL_REPAIR`, not seeded compile repair. Reference-model generation, toolbox,
scripts, and upstream execution harnesses are not extracted or executed.

Do not commit third-party dataset content here. Tests may create synthetic inputs only in
temporary directories; those inputs are mechanics tests, not evaluation evidence.
