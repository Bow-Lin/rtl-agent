# Pi Project Configuration

This directory contains repository-owned Pi configuration. The Core Loop disables Pi resource
discovery and loads reviewed files from here explicitly.

- `capability.json` declares the Pi tools enabled by the adapter.
- `extensions/` contains Pi-specific policy enforcement. The RTL policy remains inactive during
  ordinary Pi project discovery and is enabled only when the adapter sets
  `RTL_AGENT_PI_POLICY_REQUIRED=1` for a bounded turn. It also observes
  `before_provider_request` without modifying requests and observes finalized Assistant
  `message_end` responses for bounded internal transcript publication.
- `skills/` is reserved for Pi-specific skills. Shared RTL guidance lives under
  `config/agents/rtl-core-loop/` and is injected explicitly by both backends.

Local authentication, model state, and the installed Pi package do not belong here. They remain
ignored below `.rtl-agent/pi-state/` and `.rtl-agent/tools/`.

Each Pi evaluation attempt stores ordered provider exchanges below the ignored batch path
`_internal/runs/<run-id>/evidence/attempts/<attempt>/provider-transcript.json`. Every exchange
contains the final serialized request and Pi's complete parsed Assistant message; `response` is
`null` when Pi exits before finalizing that response. A turn may contain multiple exchanges after
tool calls. These files can contain complete specifications, prompts, reasoning, tool calls, model
context, and usage metadata. They contain no captured HTTP headers, credentials, or raw streamed
HTTP bytes and must be reviewed before sharing. The extension enforces the 64-request and 8-MiB
limits without silent truncation. Temporary-capture deletion uses bounded retries; final cleanup
failure produces a local stderr warning and a `localWarnings` entry without reclassifying the
Agent/RTL outcome.
