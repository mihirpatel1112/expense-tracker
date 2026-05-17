import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let envFileCache: Record<string, string> | null = null;

function parseEnvFile() {
  if (envFileCache) {
    return envFileCache;
  }

  envFileCache = {};

  try {
    const contents = readFileSync(join(process.cwd(), ".env"), "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      envFileCache[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Next normally loads .env. This fallback only helps local dev edge cases.
  }

  return envFileCache;
}

export function getEnv(name: string) {
  return process.env[name] ?? parseEnvFile()[name];
}
