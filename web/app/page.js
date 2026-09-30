"use client";
import { useEffect, useState, useRef } from "react";
import Peer from "peerjs";
import { Html5Qrcode } from "html5-qrcode";
import { MapPin, Clock, Camera, Link2, Smartphone, Upload, Wifi, WifiOff } from "lucide-react";

export default function Dashboard() {
  const [connection, setConnection] = useState(null);
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const peerRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const p = new Peer();
    peerRef.current = p;

    p.on("connection", (conn) => {
      setupConnection(conn);
    });

    return () => {
      p.destroy();
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error(e));
      }
    };
  }, []);

  const setupConnection = (conn) => {
    setConnection(conn);
    conn.on("open", () => {
      // INSTANT SYNC: Demand data the moment we connect
      conn.send({ type: "sync_request" });
    });
    conn.on("data", (payload) => {
      if (payload.type === "sync_response" || payload.lat) {
        setData(payload);
      }
    });
    conn.on("close", () => setConnection(null));
  };

  const connectToPeer = (peerId) => {
    if (peerRef.current && !connection) {
      const conn = peerRef.current.connect(peerId);
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
    } catch (e) {
      alert("Error connecting.");
    }
  };

  useEffect(() => {
    if (scanning) {
      if (!html5QrCodeRef.current) html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => { connectToPeer(decodedText); html5QrCodeRef.current.stop(); setScanning(false); },
        (err) => {}
      ).catch(err => console.error(err));
    } else {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error(e));
      }
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
    } catch (err) {
      alert("Could not read QR code from image.");
    }
    event.target.value = "";
  };

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Smartphone size={32} color="#2563eb" />
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: '24px' }}>Find My Kid</h1>
        </div>
        {connection && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '8px 16px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            {connection.open ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#ef4444" />}
            <span style={{ fontSize: '14px', color: '#334155' }}>{connection.open ? "Online" : "Offline"}</span>
          </div>
        )}
      </header>

      {!connection ? (
        <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Camera size={48} color="#64748b" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: "#1e293b" }}>Connect to Child Device</h2>
          <p style={{ color: "#64748b", marginBottom: '24px' }}>Scan the QR code or enter the 6-digit code.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button onClick={() => setScanning(!scanning)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={20} /> {scanning ? "Stop" : "Camera"}
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: '#1e293b', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={20} /> Upload
            </button>
            <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
          </div>

          <div id="qr-reader" ref={scannerRef} style={{ width: '100%', display: scanning ? 'block' : 'none' }}></div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <input 
              type="text" 
              placeholder="e.g. T4J-9X2" 
              value={manualCode} 
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', width: '150px', textAlign: 'center', fontSize: '18px', letterSpacing: '2px' }}
            />
            <button onClick={handleManualConnect} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 24px', borderRadius: '8px', cursor: 'pointer' }}>
              <Link2 size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MapPin size={20} color="#ef4444" />
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: '18px' }}>Live Location</h2>
            </div>
            {data && data.lat ? (
              <div>
                <p style={{ color: '#334155', margin: '4px 0' }}>Lat: {data.lat}</p>
                <p style={{ color: '#334155', margin: '4px 0' }}>Lng: {data.lng}</p>
                <a href={`https://www.google.com/maps?q=${data.lat},${data.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', marginTop: '8px', display: 'inline-block' }}>
                  View on Google Maps
                </a>
              </div>
            ) : <p style={{ color: '#64748b' }}>Waiting for location...</p>}
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Clock size={20} color="#f59e0b" />
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: '18px' }}>App Usage</h2>
            </div>
            {data && data.usage ? (
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "14px", color: '#334155' }}>{data.usage}</pre>
            ) : <p style={{ color: '#64748b' }}>No usage data reported yet.</p>}
          </div>
        </div>
      )}
    </main>
  );
}
