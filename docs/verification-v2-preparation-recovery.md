# Fixed five-call preparation recovery

This is an execution-recovery deviation for the user-authorized batch
`work-items-v2-20260919-prep1`, not a new extraction or a schema revision.
The original G call and versatile source call both completed. Versatile's raw
response failed the original structural contract, so the original queue stopped
before eth, ufifo, or openhmc was called. Preserve all original bytes and the
failure classification. Never repair, normalize, replace, or retry that response.

## Scope and budget

- Recover only the original eth, ufifo, and openhmc prepared requests, in order.
- Each request keeps its exact system/prompt and original source evidence. Use
  the existing no-tool Kimi K3 caller, one call each, 15 minutes each, no retry,
  no consolidation, no target request and no RTL execution. Original plus recovery
  provider requests must not exceed five.
- A completed response that fails the unchanged structural parser is retained as
  a structural failure and does not prevent the next previously uncalled source.
- Any provider, timeout, audit, filesystem or infrastructure failure stops the
  recovery. An uncertain or incomplete request is never automatically resumed.
- Use one exclusive `recovery-v1` directory. A repeated invocation is rejected
  before a model call, regardless of whether the first recovery completed.
- Valid candidates remain pending source-only semantic review. This recovery
  never publishes a library, selects a fallback, or changes the old manifest.

## Preflight and evidence

Pin the original total receipt and source preparation SHA256 values. Recompute
the original source preparation and verify the total receipt's method runtime,
the source runtime, the old 103-file runtime and old plan digest. Verify the two
original actual provider calls are complete, single request/response, no tools,
correct K3 and raw-text matched. Verify the original source failure names versatile
at structural validation and identifies exactly the remaining three sources.
The original remaining-source directories must be absent.

Bind the original preparation, failures, started markers, G seal/candidate and
both actual calls' raw evidence in the new recovery manifest. Also bind this plan,
the recovery implementation, and its tests. Recheck those bytes before each call
and before sealing the result. Persist each exact request before calling, retain
provider evidence and raw text, and write a per-source result for either valid
pending candidates or structural failure. The terminal manifest binds all new
request/response/config/transcript/raw/result files and the complete result list.

## Validation and launch boundary

Implement only new files. Run focused Node tests using injected mock callers,
strict TypeScript noEmit, focused ESLint/Prettier and a read-only real preflight.
Tests cover exact request reuse and three-call ceiling; structural failure
continuation; provider failure stopping without retry; duplicate invocation;
original evidence/runtime changes; and missing or inconsistent provider evidence.
Do not rebuild dist or execute a real provider/RTL operation during implementation.
The root agent reviews and launches the fixed recovery separately.
