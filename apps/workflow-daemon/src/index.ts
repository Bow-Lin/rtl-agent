import type * as Contracts from "@rtl-agent/contracts";
import type * as Domain from "@rtl-agent/domain";
import type * as Storage from "@rtl-agent/storage";

export type WorkflowDaemonWorkspaceDependencies = [
  typeof Contracts.packageVersion,
  typeof Domain.packageVersion,
  typeof Storage.packageVersion,
];

export const packageVersion = "0.0.0" as const;
