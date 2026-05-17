import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";

export const AUTH_COOKIE_NAME = "expense_tracker_session";

function getCredentials() {
  return {
    username: getEnv("ADMIN_USERNAME"),
    password: getEnv("ADMIN_PASSWORD"),
  };
}

function getSessionSecret() {
  const { username, password } = getCredentials();

  if (!username || !password) {
    throw new Error("Missing ADMIN_USERNAME/ADMIN_PASSWORD env vars.");
  }

  return `${username}:${password}`;
}

export function createSessionToken() {
  return createHmac("sha256", getSessionSecret())
    .update("expense-tracker-session")
    .digest("hex");
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  const expected = createSessionToken();
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  return (
    tokenBuffer.length === expectedBuffer.length &&
    timingSafeEqual(tokenBuffer, expectedBuffer)
  );
}

export function validateCredentials(username: string, password: string) {
  const credentials = getCredentials();

  return (
    username.trim() === credentials.username &&
    password === credentials.password
  );
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}
