# Pi Project Configuration

This directory contains repository-owned Pi configuration. The Core Loop disables Pi resource
discovery and loads reviewed files from here explicitly.

- `capability.json` declares the Pi tools enabled by the adapter.
- `extensions/` contains Pi-specific policy enforcement. The RTL policy remains inactive during
  ordinary Pi project discovery and is enabled only when the adapter sets
  `RTL_AGENT_PI_POLICY_REQUIRED=1` for a bounded turn. It also observes
  `before_provider_request` without modifying requests and returns those payloads to the adapter
  for bounded internal evidence publication.
- `skills/` is reserved for Pi-specific skills. Shared RTL guidance lives under
  `config/agents/rtl-core-loop/` and is injected explicitly by both backends.

Local authentication, model state, and the installed Pi package do not belong here. They remain
ignored below `.rtl-agent/pi-state/` and `.rtl-agent/tools/`.

Each Pi evaluation attempt stores the actual provider request payloads below the ignored batch
path `_internal/runs/<run-id>/evidence/attempts/<attempt>/provider-request-payloads.json`. A turn
may contain multiple requests after tool calls. These files can contain complete specifications,
prompts, and model context; they contain no captured HTTP headers or credentials and must be
reviewed before sharing. The extension enforces the 64-request and 8-MiB limits before writing or
sending an over-limit request. Temporary-capture deletion uses bounded retries; final cleanup
failure produces a local stderr warning and a `localWarnings` entry without reclassifying the
Agent/RTL outcome.
