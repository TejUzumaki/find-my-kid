"use client";
import { useEffect, useState, useRef } from "react";
import Peer from "peerjs";
import { Html5Qrcode } from "html5-qrcode";
import dynamic from "next/dynamic";
import { Camera, Upload, Link2, Wifi, WifiOff, Smartphone, Unlink, Maximize2 } from "lucide-react";
import BentoStats from "@/components/BentoStats";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Dashboard() {
  const [connection, setConnection] = useState(null);
  const [data, setData] = useState({ lat: 0, lng: 0, usage: [] });
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const peerRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const p = new Peer();
    peerRef.current = p;

    const savedPeerId = localStorage.getItem("fmk_child_peer_id");
    if (savedPeerId) {
      const conn = p.connect(savedPeerId, { reliable: true });
      setupConnection(conn);
    }

    p.on("connection", (conn) => setupConnection(conn));

    return () => {
      p.destroy();
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) html5QrCodeRef.current.stop().catch(e => {});
    };
  }, []);

  const setupConnection = (conn) => {
    setConnection(conn);
    conn.on("open", () => {
      localStorage.setItem("fmk_child_peer_id", conn.peer);
      conn.send({ type: "sync_request" });
    });
    conn.on("data", (payload) => {
      if (payload.lat) setData(payload);
    });
    conn.on("close", () => {
      setConnection(null);
      localStorage.removeItem("fmk_child_peer_id");
    });
  };

  const connectToPeer = (peerId) => {
    if (peerRef.current && !connection) {
      const conn = peerRef.current.connect(peerId, { reliable: true });
      setupConnection(conn);
    }
  };

  const handleManualConnect = async () => {
    if (!manualCode) return;
    try {
      const res = await fetch(`/api/peer-map?code=${manualCode.toUpperCase()}`);
      const json = await res.json();
      if (json.peerId) connectToPeer(json.peerId);
      else alert("Invalid or expired code.");
    } catch (e) { alert("Error connecting."); }
  };

  useEffect(() => {
    if (scanning) {
      if (!html5QrCodeRef.current) html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current.start(
        { facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText) => { connectToPeer(decodedText); html5QrCodeRef.current.stop(); setScanning(false); },
        () => {}
      ).catch(err => console.error(err));
    } else {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) html5QrCodeRef.current.stop().catch(e => {});
    }
  }, [scanning]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) await html5QrCodeRef.current.stop();
    if (!html5QrCodeRef.current) html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);
    try {
      const decodedText = await html5QrCodeRef.current.scanFile(file, false);
      connectToPeer(decodedText);
    } catch (err) { alert("Could not read QR code from image."); }
    event.target.value = "";
  };

  const cardClass = "bg-zinc-900 border-[3px] border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 relative";

  return (
    <main className="min-h-screen w-full bg-black p-4 md:p-12 font-sans flex flex-col">
      <div className="fixed inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <div className="max-w-7xl w-full mx-auto relative z-10 flex flex-col flex-1">
        <header className="mb-6 md:mb-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Smartphone size={32} className="text-blue-500" />
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">Find My Kid</h1>
          </div>
          {connection && (
            <div className={`flex items-center gap-2 px-4 py-2 border-[3px] border-white ${connection.open ? "bg-blue-500" : "bg-red-500"}`}>
              <Wifi size={16} className="text-white" />
              <span className="text-white font-black uppercase">{connection.open ? "Online" : "Offline"}</span>
            </div>
          )}
        </header>

        {!connection ? (
          <div className={`${cardClass} max-w-md mx-auto w-full`}>
            <h2 className="font-black uppercase text-2xl mb-4 text-white border-b-[3px] border-white pb-2">Connect Device</h2>
            <div className="flex justify-center gap-4 mb-6">
              <button onClick={() => setScanning(!scanning)} className={`flex items-center gap-2 px-6 py-3 border-[3px] border-white font-black uppercase ${scanning ? "bg-red-500" : "bg-blue-500"} text-white`}>
                <Camera size={20} /> {scanning ? "Stop" : "Camera"}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 border-[3px] border-white bg-zinc-800 font-black uppercase text-white">
                <Upload size={20} /> Upload
              </button>
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
            </div>
            <div id="qr-reader" ref={scannerRef} style={{ display: scanning ? 'block' : 'none' }} className="w-full aspect-square border-[3px] border-white overflow-hidden mb-6"></div>
            <div className="flex gap-2 justify-center">
              <input 
                type="text" placeholder="T4J-9X2" value={manualCode} 
                onChange={(e) => setManualCode(e.target.value.toUpperCase())} 
                className="w-32 bg-black border-[3px] border-white px-3 py-2 text-center text-white font-black tracking-widest focus:outline-none"
              />
              <button onClick={handleManualConnect} className="bg-green-500 text-white p-2 border-[3px] border-white">
                <Link2 size={24} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className={`${cardClass} ${isFullscreen ? 'fixed inset-0 z-50 m-0 h-screen' : ''}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-black uppercase text-2xl text-white">Live Map</h2>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="bg-white text-black p-2 border-[3px] border-white">
                  <Maximize2 size={16} />
                </button>
              </div>
              <div className={`${isFullscreen ? 'h-[90vh]' : 'h-[400px]'} w-full border-[3px] border-white overflow-hidden`}>
                <MapView lat={data.lat} lng={data.lng} />
              </div>
            </div>

            <BentoStats usageData={data.usage || []} />
            
            <div className="flex justify-end">
              <button onClick={() => connection.close()} className="bg-red-500 text-white px-6 py-3 border-[3px] border-white font-black uppercase flex items-center gap-2">
                <Unlink size={20} /> Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
