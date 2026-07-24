# Pi Project Configuration

This directory contains repository-owned Pi configuration. The Core Loop disables Pi resource
discovery and loads reviewed files from here explicitly.

- `capability.json` declares the Pi tools enabled by the adapter.
- `extensions/` contains Pi-specific policy enforcement. The RTL policy remains inactive during
  ordinary Pi project discovery and is enabled only when the adapter sets
  `RTL_AGENT_PI_POLICY_REQUIRED=1` for a bounded turn.
- `skills/` is reserved for Pi-specific skills. Shared RTL guidance lives under
  `config/agents/rtl-core-loop/` and is injected explicitly by both backends.

Local authentication, model state, and the installed Pi package do not belong here. They remain
ignored below `.rtl-agent/pi-state/` and `.rtl-agent/tools/`.
