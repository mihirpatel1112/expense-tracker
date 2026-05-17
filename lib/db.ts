import postgres from "postgres";
import { getEnv } from "@/lib/env";

const databaseUrl =
  getEnv("DATABASE_URL") ?? "postgres://missing:missing@localhost:5432/missing";

export function assertDatabaseUrl() {
  if (!getEnv("DATABASE_URL")) {
    throw new Error("Missing DATABASE_URL env var.");
  }
}

export const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});