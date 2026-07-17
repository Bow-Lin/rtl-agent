import { createReadStream } from "node:fs";
import { StringDecoder } from "node:string_decoder";

type ScannerState = "NORMAL" | "STRING" | "LINE_COMMENT" | "BLOCK_COMMENT" | "DIRECTIVE";

export class IncludeDirectiveScanner {
  private readonly decoder = new StringDecoder("utf8");
  private state: ScannerState = "NORMAL";
  private escaped = false;
  private pendingSlash = false;
  private pendingBlockStar = false;
  private directive = "";
  private directiveStarted = false;
  private found = false;

  public push(chunk: Uint8Array): boolean {
    if (this.found) return true;
    this.scan(this.decoder.write(Buffer.from(chunk)));
    return this.found;
  }

  public finish(): boolean {
    if (!this.found) {
      this.scan(this.decoder.end());
      if (this.state === "DIRECTIVE" && this.directive === "include") this.found = true;
    }
    return this.found;
  }

  private scan(text: string): void {
    for (let index = 0; index < text.length && !this.found; index += 1) {
      const character = text[index]!;
      if (this.state === "STRING") {
        if (character === "\n" || character === "\r") {
          this.state = "NORMAL";
          this.escaped = false;
        } else if (this.escaped) {
          this.escaped = false;
        } else if (character === "\\") {
          this.escaped = true;
        } else if (character === '"') {
          this.state = "NORMAL";
        }
        continue;
      }
      if (this.state === "LINE_COMMENT") {
        if (character === "\n" || character === "\r") this.state = "NORMAL";
        continue;
      }
      if (this.state === "BLOCK_COMMENT") {
        if (this.pendingBlockStar && character === "/") {
          this.state = "NORMAL";
          this.pendingBlockStar = false;
        } else {
          this.pendingBlockStar = character === "*";
        }
        continue;
      }
      if (this.state === "DIRECTIVE") {
        if (!this.directiveStarted && (character === " " || character === "\t")) continue;
        if (/[A-Za-z_]/.test(character)) {
          this.directiveStarted = true;
          this.directive += character;
          if (!"include".startsWith(this.directive)) this.state = "NORMAL";
          continue;
        }
        if (this.directive === "include") {
          this.found = true;
          continue;
        }
        this.state = "NORMAL";
      }
      if (this.pendingSlash) {
        this.pendingSlash = false;
        if (character === "/") {
          this.state = "LINE_COMMENT";
          continue;
        }
        if (character === "*") {
          this.state = "BLOCK_COMMENT";
          continue;
        }
      }
      if (character === "/") {
        this.pendingSlash = true;
      } else if (character === '"') {
        this.state = "STRING";
      } else if (character === "`") {
        this.state = "DIRECTIVE";
        this.directive = "";
        this.directiveStarted = false;
      }
    }
  }
}

export async function containsIncludeDirective(hostPath: string): Promise<boolean> {
  const scanner = new IncludeDirectiveScanner();
  for await (const chunk of createReadStream(hostPath, { highWaterMark: 4096 })) {
    if (scanner.push(chunk as Buffer)) return true;
  }
  return scanner.finish();
}
