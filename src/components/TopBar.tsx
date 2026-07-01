/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Bell, 
  ChevronDown, 
  ShieldAlert, 
  Clock, 
  Wifi, 
  CheckCircle,
  Database
} from "lucide-react";

interface TopBarProps {
  systemHealth: number;
  datasetSize: number;
}

export default function TopBar({ systemHealth, datasetSize }: TopBarProps) {
  const [time, setTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const notifications = [
    { id: 1, type: 'info', text: 'Machine Learning Model trained on recent quantum datasets.', time: 'Just now' },
    { id: 2, type: 'success', text: 'Quantum cryptographic connection established successfully.', time: '10m ago' },
    { id: 3, type: 'warning', text: 'Channel loss exceeded 22 dB in sector Beta-4.', time: '1h ago' },
  ];

  return (
    <header className="h-16 border-b border-white/10 bg-[#0B1020]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
      {/* Search / Breadcrumbs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[11px] text-cyan-400 font-mono tracking-widest font-medium uppercase">
            SECURE LINK COMPILER
          </span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span>DATALAKE_SIZE: </span>
          <span className="text-cyan-400 font-semibold">{datasetSize} SAMPLES</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-6">
        {/* Real-time Clock */}
        <div className="flex items-center gap-2 text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-medium tracking-wide">
            {time.toLocaleTimeString()} (UTC)
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
          {systemHealth >= 80 ? (
            <span className="text-green-500 flex items-center gap-1.5 font-medium shadow-[0_0_8px_rgba(34,197,94,0.1)]">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span> SECURE_SEC_BOUND
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></span> CRITICAL_QBER
            </span>
          )}
        </div>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button 
            id="notifications-toggle"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-lg hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300 relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-[#0B1020] border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-4 z-50">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                <span className="text-xs font-sans font-semibold text-white">Quantum Logs</span>
                <span className="text-[10px] font-mono text-cyan-400 cursor-pointer hover:underline">Clear All</span>
              </div>
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="text-xs text-slate-300 hover:bg-white/5 p-2 rounded-lg transition">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                      <span>{n.type.toUpperCase()}</span>
                      <span>{n.time}</span>
                    </div>
                    <p className="leading-normal">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-sans text-xs text-white font-bold uppercase ring-2 ring-white/10 shadow-md">
            PQ
          </div>
          <div className="hidden lg:block text-left">
            <h4 className="text-xs font-sans font-semibold text-white">Praneeth QKD</h4>
            <p className="text-[9px] font-mono text-cyan-400 font-medium tracking-widest">LEAD_SCIENTIST</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 cursor-pointer hover:text-white transition" />
        </div>
      </div>
    </header>
  );
}
