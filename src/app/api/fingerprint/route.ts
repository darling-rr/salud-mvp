import { NextResponse } from "next/server";

export const runtime = "edge";

async function sha256(input: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  const userAgent = req.headers.get("user-agent") || "";

  const salt = process.env.FP_SALT || "change-me";

  const ip_hash = ip ? await sha256(`${salt}:${ip}`) : null;
  const ua_hash = userAgent ? await sha256(`${salt}:${userAgent}`) : null;

  return NextResponse.json({ ip_hash, ua_hash });
}