import { NextResponse } from "next/server";

// In-memory store for prototype (resets on Vercel cold start, but good enough for pairing)
global.peerMap = global.peerMap || new Map();

export async function POST(req) {
  try {
    const { shortCode, peerId } = await req.json();
    global.peerMap.set(shortCode, peerId);
    // Code expires in 10 minutes
    setTimeout(() => global.peerMap.delete(shortCode), 600000);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  const code = req.nextUrl.searchParams.get("code");
  const peerId = global.peerMap.get(code);
  if (peerId) return NextResponse.json({ peerId });
  return NextResponse.json({ error: "Code not found or expired" }, { status: 404 });
}
