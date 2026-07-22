import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

const ENDPOINT = "https://api.kimi.com/coding/v1/chat/completions";
const MODEL = "kimi-for-coding";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstChoice(value: unknown): Record<string, unknown> | undefined {
  const choices = asRecord(value)?.choices;
  return Array.isArray(choices) ? asRecord(choices[0]) : undefined;
}

function responseAnswer(value: unknown): string | undefined {
  const message = asRecord(firstChoice(value)?.message);
  return typeof message?.content === "string" ? message.content.trim() : undefined;
}

function responseMetadata(value: unknown): Record<string, unknown> {
  const choice = firstChoice(value);
  const usage = asRecord(asRecord(value)?.usage);
  return {
    finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
    completionTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null,
  };
}

function responseError(value: unknown): Record<string, unknown> {
  const response = asRecord(value);
  const error = asRecord(response?.error);
  return {
    ...(typeof error?.code === "string" ? { code: error.code } : {}),
    message:
      typeof error?.message === "string" ? error.message : "Kimi Code API request was rejected",
  };
}

async function main(): Promise<void> {
  const environment = parseEnv(await readFile(".env", "utf8"));
  const apiKey = environment.KIMI_CODE_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error(".env 中未找到非空的 KIMI_CODE_API_KEY");
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: `who are you. waht time is it?` }],
      max_tokens: 512,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const result: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          httpOk: false,
          answerOk: false,
          status: response.status,
          error: responseError(result),
        },
        undefined,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const answer = responseAnswer(result);
  const model = asRecord(result)?.model;
  const httpOk = true;
  const answerOk = answer !== undefined && answer.length > 0;
  const ok = httpOk && answerOk;
  console.log(
    JSON.stringify(
      {
        ok,
        httpOk,
        answerOk,
        model: typeof model === "string" ? model : MODEL,
        answer: answer ?? null,
        ...responseMetadata(result),
      },
      undefined,
      2,
    ),
  );
  if (!ok) process.exitCode = 1;
}

await main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Kimi Code connection test failed",
        },
      },
      undefined,
      2,
    ),
  );
  process.exitCode = 1;
});
