import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { AgentAttemptInputSchema } from "../../packages/core-loop/dist/index.js";
import type { CoreLoopRun, RtlAgentAdapter } from "../../packages/core-loop/dist/index.js";
import { BUILD, frozenContext, hash } from "./verification-frozen-adapter.ts";
import { safeRead } from "./verification-memory.ts";
import type { Item } from "./verification-memory.ts";

export const DIRECTED_MEMORY_ID = "consol-mid-reset-assert";
export const DIRECTED_WORK_ITEM = [
  "## 指定策略工作项",
  "",
  "本次主要工作是判断给定策略在当前 DUT、固定配置和初始验证环境中的适用性，并在适用时落实到允许修改的验证资产。",
  "若基线已经包含该行为，或策略不适用，应给出实际代码依据，并区分已有激励、已有检查和仍缺少的行为。",
  "若需要新增行为，应在现有调用预算内将策略映射到实际代码，核对检查内容、采样窗口和判错依据，并给出能够证明检查执行的证据。",
  "明确区分已实现、已执行、尚未执行和不适用；没有执行证据时如实说明，不额外请求调用或改变现有停止规则。",
].join("\n");

// Only object keys are sorted. Original strings and evidence-array order remain untouched.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function directedContext(repo: string) {
  const original = await frozenContext(repo);
  const catalogBytes = await safeRead(repo, `.rtl-agent/verification-memory/${BUILD}/items.json`);
  assert.equal(`sha256:${hash(catalogBytes)}`, original.itemsDigest, "FROZEN_ITEMS_CHANGED");
  const catalog = JSON.parse(catalogBytes.toString()) as { schemaVersion: number; items: Item[] };
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.items[9]?.id, DIRECTED_MEMORY_ID, "MEMORY10_ID_CHANGED");
  const matches = catalog.items.filter((item) => item.id === DIRECTED_MEMORY_ID);
  assert.equal(matches.length, 1, "DIRECTED_MEMORY_NOT_UNIQUE");
  const selectedItem = matches[0]!;
  const selectedItemCanonical = canonical(selectedItem);
  const marker = "Deterministic select-all-v1:";
  const at = original.content.indexOf(marker);
  assert.ok(at > 0, "ORIGINAL_ADVISORY_MISSING");
  const advisory = original.content.slice(0, at);
  const content =
    advisory +
    DIRECTED_WORK_ITEM +
    "\n\n" +
    "Deterministic select-memory10-v1: one designated item from the unchanged source catalog. No target feedback or model selection.\n\n" +
    JSON.stringify({ schemaVersion: 1, items: [selectedItem] }, null, 2) +
    "\n";
  assert.ok(Buffer.byteLength(content) <= 100_000);
  return {
    content,
    selectedIds: [DIRECTED_MEMORY_ID],
    selectedItem,
    selectedItemCanonical,
    selectedItemDigest: hash(selectedItemCanonical),
    manifestDigest: original.manifestDigest,
    itemsDigest: original.itemsDigest,
    injectionDigest: hash(content),
    addendumDigest: hash(DIRECTED_WORK_ITEM),
  };
}

/** One original item plus an explicit work priority; does not alter permissions or budgets. */
export function withDirectedMemory(delegate: RtlAgentAdapter, repo: string): RtlAgentAdapter {
  let preparedRun: string | undefined;
  let originalSpec: Buffer | undefined;
  let preparedSpec: Buffer | undefined;
  let lastAttempt: number | undefined;
  return {
    probe: () => delegate.probe(),
    async runTurn(raw: unknown, run: CoreLoopRun) {
      const input = AgentAttemptInputSchema.parse(raw);
      assert.equal(
        run.fixture.provenance.identity.caseId,
        "dpretet-depth8-width8",
        "DIRECTED_TARGET_REQUIRED",
      );
      assert.equal(input.relevantMemoryPath, undefined, "DIRECTED_INPUT_ALREADY_HAS_MEMORY");
      assert.equal(
        input.attempt,
        lastAttempt === undefined ? 2 : lastAttempt + 1,
        "DIRECTED_ATTEMPT_ORDER",
      );
      assert.ok(input.attempt <= 4, "DIRECTED_THREE_TURN_BUDGET");
      if (preparedRun !== undefined)
        assert.equal(run.runDirectory, preparedRun, "DIRECTED_RUN_CHANGED");
      const selected = await directedContext(repo);
      const current = await safeRead(run.workspaceDirectory, "spec.md");
      const contextPath = "context/relevant-rtl-memory.md";
      if (preparedSpec === undefined) {
        assert.ok(!current.includes(DIRECTED_WORK_ITEM), "DIRECTED_DUPLICATE_WORK_ITEM");
        originalSpec = current;
        preparedSpec = Buffer.concat([current, Buffer.from(`\n\n${DIRECTED_WORK_ITEM}\n`)]);
        preparedRun = run.runDirectory;
        await writeFile(
          path.join(run.workspaceDirectory, "context", "relevant-rtl-memory.md"),
          selected.content,
          { flag: "wx" },
        );
        await writeFile(path.join(run.workspaceDirectory, "spec.md"), preparedSpec);
      } else {
        assert.deepEqual(current, preparedSpec, "DIRECTED_SPEC_CHANGED");
        assert.equal(
          (await safeRead(run.workspaceDirectory, contextPath)).toString(),
          selected.content,
          "DIRECTED_CONTEXT_CHANGED",
        );
      }
      await writeFile(
        path.join(run.runDirectory, "evidence", `directed-memory-${input.attempt}.json`),
        JSON.stringify(
          {
            schemaVersion: 1,
            attempt: input.attempt,
            mode: "directed-memory10",
            selector: "select-memory10-v1",
            build: BUILD,
            selectedIds: selected.selectedIds,
            selectedItem: selected.selectedItem,
            selectedItemDigest: selected.selectedItemDigest,
            itemDigestCanonicalization:
              "UTF-8 JSON with recursively sorted object keys; strings and array order preserved",
            manifestDigest: selected.manifestDigest,
            itemsDigest: selected.itemsDigest,
            injectionDigest: selected.injectionDigest,
            addendumDigest: selected.addendumDigest,
            originalSpecDigest: hash(originalSpec!),
            preparedSpecDigest: hash(preparedSpec),
            placement: [
              "context/relevant-rtl-memory.md after original advisory, before selected item",
              "spec.md append-only",
            ],
            sourceCatalogCount: 13,
            selectedCount: 1,
            targetUpdates: false,
            additionalModelTurns: 0,
            reviewStatus: "PENDING_HUMAN_REVIEW",
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      lastAttempt = input.attempt;
      try {
        return await delegate.runTurn({ ...input, relevantMemoryPath: contextPath }, run);
      } finally {
        assert.deepEqual(
          await safeRead(run.workspaceDirectory, "spec.md"),
          preparedSpec,
          "DIRECTED_SPEC_CHANGED",
        );
        assert.equal(
          (await safeRead(run.workspaceDirectory, contextPath)).toString(),
          selected.content,
          "DIRECTED_CONTEXT_CHANGED",
        );
      }
    },
  };
}
