/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  Home, 
  Cpu, 
  Radio, 
  Brain, 
  Database, 
  LineChart, 
  ShieldCheck, 
  FileText, 
  Settings, 
  Zap,
  Sparkles,
  Network,
  History
} from "lucide-react";
import { ActiveTab } from "../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  systemHealth: number;
}

export default function Sidebar({ activeTab, setActiveTab, systemHealth }: SidebarProps) {
  const menuItems = [
    { id: 'landing', label: 'Home / Welcome', icon: Home },
    { id: 'simulation', label: 'BB84 Simulation', icon: Cpu },
    { id: 'multi-sender', label: 'Multi-Sender QKD', icon: Network },
    { id: 'visualization', label: 'Quantum Channel', icon: Radio },
    { id: 'prediction', label: 'ML QBER Predictor', icon: Brain },
    { id: 'temporal-analysis', label: 'Temporal QBER Analysis', icon: History },
    { id: 'dataset', label: 'Quantum Dataset', icon: Database },
    { id: 'analytics', label: 'Analytics & Charts', icon: LineChart },
    { id: 'model-details', label: 'AI Model Details', icon: ShieldCheck },
    { id: 'results', label: 'Results & PDF Report', icon: FileText },
    { id: 'settings', label: 'Control Panel', icon: Settings },
  ] as const;

  return (
    <aside id="qkd-sidebar" className="w-80 bg-[#0B1020] border-r border-white/10 flex flex-col justify-between h-screen sticky top-0 backdrop-blur-md">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Zap className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#0B1020] animate-ping" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#0B1020] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </div>
            <div>
              <h1 className="font-sans font-bold tracking-tight text-white text-base leading-tight">
                AETHERIS-QKD
              </h1>
              <p className="font-mono text-[9px] text-cyan-400 font-medium tracking-widest">
                AI PREDICTION CORE
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-sans transition-all duration-300 relative group text-left ${
                  isActive 
                    ? 'text-cyan-400 font-medium' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-white/5 rounded-lg border-l-2 border-cyan-400"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="relative z-10">{item.label}</span>
                {item.id === 'prediction' && (
                  <span className="ml-auto relative z-10 px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-400/20 text-[9px] text-cyan-300 rounded font-mono uppercase tracking-wider">
                    Live
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Health Status Indicator at Bottom of Sidebar */}
      <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            System Status
          </span>
          <span className={`text-xs font-mono font-semibold ${systemHealth >= 80 ? 'text-emerald-400' : systemHealth >= 50 ? 'text-yellow-400' : 'text-rose-400'}`}>
            {systemHealth}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${systemHealth}%` }}
            transition={{ duration: 1 }}
            className={`h-full rounded-full ${
              systemHealth >= 80 
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                : systemHealth >= 50 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
                  : 'bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            }`}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[9px] text-slate-500 font-mono">NODE_US_EAST_01</span>
          <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
