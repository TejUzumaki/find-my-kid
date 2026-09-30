import { NextResponse } from "next/server";

global.peerMap = global.peerMap || new Map();

export async function POST(req) {
  try {
    const { shortCode, peerId } = await req.json();
    global.peerMap.set(shortCode, peerId);
    setTimeout(() => global.peerMap.delete(shortCode), 600000);
    
    const res = NextResponse.json({ success: true });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (e) {
    const res = NextResponse.json({ error: e.message }, { status: 500 });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }
}

export async function GET(req) {
  const code = req.nextUrl.searchParams.get("code");
  const peerId = global.peerMap.get(code);
  
  const res = new NextResponse();
  res.headers.set('Access-Control-Allow-Origin', '*');
  
  if (peerId) {
    return NextResponse.json({ peerId }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  return NextResponse.json({ error: "Code not found or expired" }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
}
