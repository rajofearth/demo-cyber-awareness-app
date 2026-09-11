"use server";

import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "ph_session";
const SESSION_MS = 30 * 60 * 1000;

function convexSite(): string {
  return (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(".cloud", ".site");
}

function sign(payload: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(payload).digest("hex");
}

export type AuthState = { error?: string } | null;

export async function authenticate(prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "At least 8 characters" };
  }

  const base = convexSite();
  let configured = false;
  try {
    const confRes = await fetch(`${base}/api/auth/configured`, { cache: "no-store" });
    configured = ((await confRes.json()) as { configured: boolean }).configured;
  } catch {
    return { error: "Backend unreachable" };
  }

  if (!configured && password !== confirm) {
    return { error: "Passwords do not match" };
  }

  const path = configured ? "/api/auth/login" : "/api/auth/setup";
  let data: { ok?: boolean; error?: string };
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });
    data = (await res.json()) as { ok?: boolean; error?: string };
  } catch {
    return { error: "Backend unreachable" };
  }

  if (data.ok !== true) {
    return { error: data.error ?? "Authentication failed" };
  }

  const exp = String(Date.now() + SESSION_MS);
  const jar = await cookies();
  jar.set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MS / 1000,
    path: "/",
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}
