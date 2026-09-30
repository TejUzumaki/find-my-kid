"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export default function MapView({ lat, lng }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [lng || 0, lat || 0],
      zoom: 14,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
  }, []);

  useEffect(() => {
    if (map.current && lat && lng) {
      map.current.flyTo({ center: [lng, lat], speed: 1.5 });
      if (!marker.current) {
        marker.current = new maplibregl.Marker({ color: "#3b82f6" })
          .setLngLat([lng, lat])
          .addTo(map.current);
      } else {
        marker.current.setLngLat([lng, lat]);
      }
    }
  }, [lat, lng]);

  return <div ref={mapContainer} className="w-full h-full min-h-[300px] bg-zinc-900" />;
}
