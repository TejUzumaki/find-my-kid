"use client";
import { useEffect, useState, useRef } from "react";
import Peer from "peerjs";
import { Html5Qrcode } from "html5-qrcode";
import L from "leaflet";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Camera, Upload, Link2, Wifi, WifiOff, MapPin, Clock, Smartphone, Unlink, Bug } from "lucide-react";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];

export default function Dashboard() {
  const [connection, setConnection] = useState(null);
  const [data, setData] = useState({ lat: 0, lng: 0, usage: [] });
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [logs, setLogs] = useState([]);
  const peerRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const initMap = () => {
      if (typeof window !== "undefined" && window.L && !mapRef.current && document.getElementById("map-container")) {
        mapRef.current = window.L.map("map-container").setView([0, 0], 2);
        window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(mapRef.current);
      }
    };

    const mapTimer = setInterval(() => {
      if (window.L) { initMap(); clearInterval(mapTimer); }
    }, 500);

    const p = new Peer();
    peerRef.current = p;
    addLog("PeerJS initialized.");

    // Auto-Reconnect from LocalStorage
    const savedPeerId = localStorage.getItem("fmk_child_peer_id");
    if (savedPeerId) {
      addLog("Found saved connection. Attempting to reconnect...");
      const conn = p.connect(savedPeerId, { reliable: true });
      setupConnection(conn);
    }

    p.on("connection", (conn) => setupConnection(conn));

    return () => {
      clearInterval(mapTimer);
      p.destroy();
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) html5QrCodeRef.current.stop().catch(e => console.error(e));
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  const setupConnection = (conn) => {
    setConnection(conn);
    conn.on("open", () => {
      addLog(`Connected to ${conn.peer}`);
      localStorage.setItem("fmk_child_peer_id", conn.peer); // Save for persistence
      conn.send({ type: "sync_request" });
    });
    conn.on("data", (payload) => {
      if (payload.lat) {
        setData(payload);
        if (mapRef.current && window.L) {
          if (!markerRef.current) {
            markerRef.current = window.L.marker([payload.lat, payload.lng]).addTo(mapRef.current);
          } else {
            markerRef.current.setLatLng([payload.lat, payload.lng]);
          }
          mapRef.current.setView([payload.lat, payload.lng], 15);
        }
      }
    });
    conn.on("close", () => {
      addLog("Connection closed.");
      setConnection(null);
      localStorage.removeItem("fmk_child_peer_id"); // Clear on disconnect
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
        (err) => {}
      ).catch(err => console.error(err));
    } else {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) html5QrCodeRef.current.stop().catch(e => console.error(e));
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

  const disconnect = () => {
    if (connection) connection.close();
  };

  const cardStyle = { background: '#1e293b', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid #334155' };
  const btnStyle = { border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', justifyContent: 'center' };

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "24px", minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Smartphone size={32} color="#3b82f6" />
          <h1 style={{ margin: 0, fontSize: '24px', color: '#f8fafc' }}>Find My Kid</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {connection && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '8px 16px', borderRadius: '20px', border: '1px solid #334155' }}>
              {connection.open ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#ef4444" />}
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>{connection.open ? "Online" : "Offline"}</span>
            </div>
          )}
          <button onClick={() => setShowDebug(!showDebug)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <Bug size={20} />
          </button>
        </div>
      </header>

      {showDebug && (
        <div style={{ ...cardStyle, marginBottom: '16px', background: '#020617', border: '1px solid #334155' }}>
          <pre style={{ margin: 0, color: '#10b981', fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {logs.join("\n")}
          </pre>
        </div>
      )}

      {!connection ? (
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <Camera size={48} color="#3b82f6" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>Connect to Child Device</h2>
          <p style={{ color: "#94a3b8", marginBottom: '24px' }}>Scan the QR code or enter the 6-digit code.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button onClick={() => setScanning(!scanning)} style={{ ...btnStyle, background: scanning ? '#ef4444' : '#3b82f6', color: 'white' }}>
              <Camera size={20} /> {scanning ? "Stop Camera" : "Use Camera"}
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btnStyle, background: '#334155', color: 'white' }}>
              <Upload size={20} /> Upload Image
            </button>
            <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
          </div>

          <div id="qr-reader" ref={scannerRef} style={{ width: '100%', display: scanning ? 'block' : 'none', borderRadius: '12px', overflow: 'hidden' }}></div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            <input 
              type="text" placeholder="T4J-9X2" value={manualCode} 
              onChange={(e) => setManualCode(e.target.value.toUpperCase())} 
              style={{ background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '8px', padding: '12px', width: '150px', textAlign: 'center', fontSize: '18px', letterSpacing: '2px', color: '#f8fafc' }}
            />
            <button onClick={handleManualConnect} style={{ ...btnStyle, background: '#10b981', color: 'white' }}>
              <Link2 size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={20} color="#3b82f6" />
                <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>Live Location</h2>
              </div>
              <button onClick={disconnect} style={{ ...btnStyle, background: '#ef4444', color: 'white', padding: '8px 16px', fontSize: '14px' }}>
                <Unlink size={16} /> Disconnect
              </button>
            </div>
            <div id="map-container" style={{ height: '300px', borderRadius: '12px', zIndex: 0, border: '1px solid #334155' }}></div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={20} color="#8b5cf6" />
              <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>App Usage Analytics</h2>
            </div>
            
            {data.usage && data.usage.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div>
                  <h3 style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Time Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.usage} dataKey="minutes" nameKey="app" cx="50%" cy="50%" outerRadius={80} fill="#3b82f6">
                        {data.usage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Top Apps (Minutes)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.usage.slice(0, 5)}>
                      <XAxis dataKey="app" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" />
                      <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>Waiting for usage data...</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
