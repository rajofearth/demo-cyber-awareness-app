import { NextRequest, NextResponse } from "next/server";

const COOKIE = "ph_session";
const SESSION_MS = 30 * 60 * 1000;

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function valid(value: string | undefined): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !value) return false;
  const idx = value.indexOf(".");
  if (idx <= 0) return false;
  const expStr = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await sign(expStr, secret);
  return sig === expected;
}

export async function middleware(req: NextRequest) {
  const cookieValue = req.cookies.get(COOKIE)?.value;
  const ok = await valid(cookieValue);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const res = NextResponse.redirect(url);
    if (cookieValue) res.cookies.delete(COOKIE);
    return res;
  }

  const secret = process.env.AUTH_SECRET as string;
  const exp = String(Date.now() + SESSION_MS);
  const res = NextResponse.next();
  res.cookies.set(COOKIE, `${exp}.${await sign(exp, secret)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MS / 1000,
    path: "/",
  });
  return res;
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
