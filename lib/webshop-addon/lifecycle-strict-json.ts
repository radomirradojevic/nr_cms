/** Minimal strict JSON reader for signed lifecycle envelopes. */
export function parseStrictJson(raw: Buffer, label: string): unknown {
  const text = raw.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(raw)) throw new Error(`${label} is not UTF-8.`);
  return new Parser(text, label).parse();
}

class Parser {
  private index = 0;
  constructor(private readonly text: string, private readonly label: string) {}
  parse(): unknown { this.ws(); const value = this.value(); this.ws(); if (this.index !== this.text.length) this.fail("has trailing data"); return value; }
  private value(): unknown {
    const char = this.text[this.index];
    if (char === "{") return this.object(); if (char === "[") return this.array(); if (char === '"') return this.string();
    if (char === "t") return this.literal("true", true); if (char === "f") return this.literal("false", false); if (char === "n") return this.literal("null", null);
    if (char === "-" || (char && char >= "0" && char <= "9")) return this.number(); this.fail("contains an invalid JSON value");
  }
  private object(): Record<string, unknown> {
    this.index += 1; this.ws(); const output: Record<string, unknown> = Object.create(null); const seen = new Set<string>();
    if (this.text[this.index] === "}") { this.index += 1; return output; }
    while (true) { if (this.text[this.index] !== '"') this.fail("has an invalid object key"); const key = this.string(); if (seen.has(key)) this.fail(`contains duplicate member ${JSON.stringify(key)}`); seen.add(key); this.ws(); if (this.text[this.index] !== ":") this.fail("has an object member without a colon"); this.index += 1; this.ws(); output[key] = this.value(); this.ws(); if (this.text[this.index] === "}") { this.index += 1; return output; } if (this.text[this.index] !== ",") this.fail("has an invalid object separator"); this.index += 1; this.ws(); }
  }
  private array(): unknown[] { this.index += 1; this.ws(); const output: unknown[] = []; if (this.text[this.index] === "]") { this.index += 1; return output; } while (true) { output.push(this.value()); this.ws(); if (this.text[this.index] === "]") { this.index += 1; return output; } if (this.text[this.index] !== ",") this.fail("has an invalid array separator"); this.index += 1; this.ws(); } }
  private string(): string { const start = this.index; this.index += 1; while (this.index < this.text.length) { const char = this.text[this.index]!; if (char === '"') { this.index += 1; let value: unknown; try { value = JSON.parse(this.text.slice(start, this.index)); } catch { this.fail("contains an invalid JSON string"); } if (typeof value !== "string") this.fail("contains an invalid JSON string"); return value; } if (char === "\\") { const escaped = this.text[this.index + 1]; if (!escaped || !'"\\/bfnrtu'.includes(escaped)) this.fail("contains an invalid string escape"); if (escaped === "u") { if (!/^[0-9a-fA-F]{4}$/.test(this.text.slice(this.index + 2, this.index + 6))) this.fail("contains invalid unicode"); this.index += 6; } else this.index += 2; continue; } if (char < " ") this.fail("contains an unescaped control character"); this.index += 1; } this.fail("contains an unterminated string"); }
  private number(): number { const match = this.text.slice(this.index).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/); if (!match) this.fail("contains an invalid JSON number"); this.index += match![0].length; const value = Number(match![0]); if (!Number.isFinite(value)) this.fail("contains an invalid JSON number"); return value; }
  private literal<T>(literal: string, value: T): T { if (this.text.slice(this.index, this.index + literal.length) !== literal) this.fail("contains an invalid JSON literal"); this.index += literal.length; return value; }
  private ws() { while (/\s/.test(this.text[this.index] ?? "")) this.index += 1; }
  private fail(message: string): never { throw new Error(`${this.label} ${message}.`); }
}
