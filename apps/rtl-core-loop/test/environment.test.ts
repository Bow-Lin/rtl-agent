import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadRepositoryEnvironment } from "../src/environment.js";

describe("repository environment", () => {
  it("loads only standard agent settings without leaking unrelated or legacy values", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-environment-"));
    await writeFile(
      path.join(root, ".env"),
      "KIMI_CODE_API_KEY=file-key\nkimi=legacy-key\nUNRELATED_SECRET=must-not-load\nRTL_AGENT_OPENCODE_VERSION=1.18.2\n",
      "utf8",
    );
    await writeFile(
      path.join(root, ".env.local"),
      "RTL_AGENT_OPENCODE_MODEL=kimi-code/kimi-for-coding\nRTL_AGENT_PI_PROVIDER=kimi-coding\nRTL_AGENT_PI_MODEL=kimi-for-coding\n",
      "utf8",
    );

    const environment = await loadRepositoryEnvironment(root, {
      RTL_AGENT_OPENCODE_VERSION: "shell-version",
    });

    expect(environment).toMatchObject({
      KIMI_CODE_API_KEY: "file-key",
      RTL_AGENT_OPENCODE_VERSION: "shell-version",
      RTL_AGENT_OPENCODE_MODEL: "kimi-code/kimi-for-coding",
      RTL_AGENT_PI_PROVIDER: "kimi-coding",
      RTL_AGENT_PI_MODEL: "kimi-for-coding",
    });
    expect(environment.UNRELATED_SECRET).toBeUndefined();
    expect(environment.kimi).toBeUndefined();
    expect(Object.values(environment)).not.toContain("legacy-key");
  });
});
