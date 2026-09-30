"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

const COLORS = ["#f87171", "#4ade80", "#60a5fa", "#fbbf24", "#a78bfa"];

export default function BentoStats({ usageData }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

  const pieData = usageData.slice(0, 4).map((u, i) => ({
    label: u.app.split(" ")[0].substring(0, 6).toUpperCase(),
    value: u.minutes,
    color: COLORS[i]
  }));

  const barData = usageData.slice(0, 5).map((u, i) => ({
    label: u.app.split(" ")[0].substring(0, 3).toUpperCase(),
    value: u.minutes,
    color: COLORS[i % COLORS.length]
  }));

  const totalMin = pieData.reduce((acc, curr) => acc + curr.value, 0) || 1;
  let cumulativePercent = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="w-full min-h-[300px] bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 relative flex flex-col">
          <h3 className="font-black uppercase text-xl mb-6 border-b-[3px] border-white pb-2 text-white">
            Top Apps (Min)
          </h3>
          <div className="flex justify-between items-end flex-1 gap-2 sm:gap-4 min-h-[150px]">
            {barData.length > 0 ? barData.map((item, i) => (
              <div key={i} className="relative flex-1 h-full flex items-end group">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.value / Math.max(...barData.map(d=>d.value), 1)) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.1 }}
                  onHoverStart={() => setHoveredBar(i)}
                  onHoverEnd={() => setHoveredBar(null)}
                  className={cn("w-full border-[3px] border-white relative z-10 cursor-pointer origin-bottom flex items-center justify-center overflow-hidden")}
                  style={{ backgroundColor: item.color }}
                >
                  <span className="relative z-20 font-bold text-xs font-mono text-black/80">
                    {item.label}
                  </span>
                </motion.div>
                <AnimatePresence>
                  {hoveredBar === i && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-full -mb-2 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-1 text-sm font-black whitespace-nowrap border-[3px] border-white z-30 pointer-events-none">
                      {item.value}m
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )) : <div className="text-zinc-500 m-auto">Waiting for data...</div>}
          </div>
        </div>
      </div>

      <div className="h-full min-h-[300px] flex">
        <div className="w-full h-full bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 flex flex-col items-center justify-between overflow-hidden relative">
          <h3 className="font-black uppercase tracking-tighter text-2xl border-b-[3px] border-white pb-2 mb-8 w-full text-center text-white">
            Time Distribution
          </h3>
          <div className="z-10 flex flex-col items-center w-full justify-center">
            <div className="relative w-48 h-48">
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="-rotate-90 overflow-visible w-full h-full">
                {pieData.length > 0 ? pieData.map((slice) => {
                  const startPercent = cumulativePercent;
                  const endPercent = cumulativePercent + slice.value / totalMin;
                  cumulativePercent = endPercent;
                  const [startX, startY] = [Math.cos(2 * Math.PI * startPercent), Math.sin(2 * Math.PI * startPercent)];
                  const [endX, endY] = [Math.cos(2 * Math.PI * endPercent), Math.sin(2 * Math.PI * endPercent)];
                  const largeArcFlag = slice.value / totalMin > 0.5 ? 1 : 0;
                  const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(" ");
                  return (
                    <motion.path
                      key={slice.label}
                      d={pathData}
                      fill={slice.color}
                      className="stroke-black"
                      strokeWidth="0.04"
                      animate={{ scale: hoveredSlice === slice.label ? 1.05 : 1, opacity: hoveredSlice && hoveredSlice !== slice.label ? 0.3 : 1 }}
                      onMouseEnter={() => setHoveredSlice(slice.label)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  );
                }) : <text x="0" y="0" fill="#666" textAnchor="middle">No Data</text>}
                <circle cx="0" cy="0" r="0.55" className="fill-black stroke-white" strokeWidth="0.04" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-black text-white">
                    {hoveredSlice ? `${pieData.find(d => d.label === hoveredSlice)?.value}m` : `${totalMin}m`}
                  </span>
                  <span className="text-[10px] font-black uppercase text-zinc-400">{hoveredSlice || "TOTAL"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
