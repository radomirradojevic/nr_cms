import { all, createLowlight } from "lowlight";

export const CODE_LANGUAGES = [
  { value: "auto", label: "Auto detect" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "powershell", label: "PowerShell" },
  { value: "python", label: "Python" },
  { value: "yaml", label: "YAML" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "terraform", label: "Terraform/HCL" },
  { value: "csharp", label: "C#" },
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number]["value"];

export const lowlight = createLowlight(all);

lowlight.registerAlias({
  javascript: ["js", "jsx"],
  typescript: ["ts", "tsx"],
  bash: ["sh", "shell", "zsh"],
  powershell: ["ps", "ps1"],
  yaml: ["yml"],
  xml: ["html"],
  terraform: ["hcl", "tf"],
  csharp: ["cs"],
});

export function normalizeCodeLanguage(value: unknown): CodeLanguage {
  if (typeof value !== "string" || value.trim() === "") return "auto";
  const normalized = value.trim().toLowerCase();
  if (normalized === "hcl" || normalized === "tf") return "terraform";
  if (normalized === "cs") return "csharp";
  if (normalized === "sh" || normalized === "shell" || normalized === "zsh") {
    return "bash";
  }
  if (normalized === "ps" || normalized === "ps1") return "powershell";
  if (normalized === "yml") return "yaml";
  if (normalized === "html") return "html";
  return CODE_LANGUAGES.some((language) => language.value === normalized)
    ? (normalized as CodeLanguage)
    : "auto";
}

export function languageForTiptap(value: CodeLanguage): string | null {
  if (value === "auto") return null;
  if (value === "html") return "xml";
  return value;
}
