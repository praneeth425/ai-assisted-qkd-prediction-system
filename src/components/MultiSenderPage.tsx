/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Network, 
  Play, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  Download, 
  Upload, 
  FileText, 
  Activity, 
  Info, 
  ChevronRight, 
  Sliders, 
  Gauge, 
  HelpCircle 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from "recharts";

interface SenderConfig {
  id: string;
  name: string;
  channelLoss: number;         // 0 - 30 dB
  noise: number;               // 0 - 0.5
  detectorEfficiency: number;  // 0.1 - 1.0
  darkCounts: number;          // 0 - 0.05
  misalignment: number;        // 0 - 45 deg
  numBits: number;             // default 1000
  actualQber?: number;
  predictedQber?: number;
  confidence?: number;
  communicationStatus?: "Secure" | "Moderate Risk" | "High Risk";
  systemHealth?: number;
  rank?: number;
}

interface MultiSenderResults {
  senders: SenderConfig[];
  analytics: {
    totalSenders: number;
    bestSender: { id: string; name: string; predictedQber: number; actualQber: number };
    worstSender: { id: string; name: string; predictedQber: number; actualQber: number };
    averageQber: number;
    highestQber: number;
    lowestQber: number;
    averageChannelLoss: number;
    networkHealthScore: number;
    secureCommunicationPercentage: number;
  };
  bestSenderId: string;
  recommendationReasoning: string;
}

export default function MultiSenderPage() {
  // Senders list state
  const [senders, setSenders] = useState<SenderConfig[]>([
    { id: "Alice-1", name: "Alice-1", channelLoss: 2.5, noise: 0.02, detectorEfficiency: 0.90, darkCounts: 0.0005, misalignment: 1.2, numBits: 1000 },
    { id: "Alice-2", name: "Alice-2", channelLoss: 8.0, noise: 0.05, detectorEfficiency: 0.85, darkCounts: 0.001, misalignment: 3.5, numBits: 1000 },
    { id: "Alice-3", name: "Alice-3", channelLoss: 15.0, noise: 0.12, detectorEfficiency: 0.70, darkCounts: 0.003, misalignment: 8.0, numBits: 1000 }
  ]);

  const [activeSenderId, setActiveSenderId] = useState<string>("Alice-1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<MultiSenderResults | null>(null);
  const [activeTab, setActiveTab] = useState<"visualizer" | "charts" | "report">("visualizer");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Network colors for different senders
  const colors = [
    "#06b6d4", // cyan
    "#a855f7", // purple
    "#10b981", // emerald
    "#ec4899", // pink
    "#f59e0b", // amber
    "#3b82f6", // blue
    "#f43f5e", // rose
    "#14b8a6", // teal
    "#84cc16", // lime
    "#eab308", // yellow
  ];

  // Load results on mount
  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await fetch("/api/multi_sender/results");
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        if (data && data.senders) {
          setSenders(data.senders.map((s: any) => ({
            id: s.id,
            name: s.name,
            channelLoss: s.channelLoss,
            noise: s.noise,
            detectorEfficiency: s.detectorEfficiency,
            darkCounts: s.darkCounts,
            misalignment: s.misalignment,
            numBits: s.numBits,
            actualQber: s.actualQber,
            predictedQber: s.predictedQber,
            confidence: s.confidence,
            communicationStatus: s.communicationStatus,
            systemHealth: s.systemHealth,
            rank: s.rank
          })));
        }
      }
    } catch (err) {
      console.error("Failed to fetch initial multi-sender results", err);
    }
  };

  // Run multi-sender simulations and predictions
  const handleRunAll = async () => {
    setIsLoading(true);
    try {
      // 1. Simulate
      const simRes = await fetch("/api/multi_sender/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senders })
      });
      if (!simRes.ok) throw new Error("Simulation endpoint failed");
      const simData = await simRes.json();

      // 2. Predict
      const predRes = await fetch("/api/multi_sender/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senders: simData.senders })
      });
      if (!predRes.ok) throw new Error("Prediction endpoint failed");
      const predData = await predRes.json();

      setResults(predData);
    } catch (err: any) {
      console.error("Error executing multi-sender pipeline", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    const defaultSenders = [
      { id: "Alice-1", name: "Alice-1", channelLoss: 2.5, noise: 0.02, detectorEfficiency: 0.90, darkCounts: 0.0005, misalignment: 1.2, numBits: 1000 },
      { id: "Alice-2", name: "Alice-2", channelLoss: 8.0, noise: 0.05, detectorEfficiency: 0.85, darkCounts: 0.001, misalignment: 3.5, numBits: 1000 },
      { id: "Alice-3", name: "Alice-3", channelLoss: 15.0, noise: 0.12, detectorEfficiency: 0.70, darkCounts: 0.003, misalignment: 8.0, numBits: 1000 }
    ];
    setSenders(defaultSenders);
    setActiveSenderId("Alice-1");
    setResults(null);
  };

  // Add a sender dynamically (limit 20)
  const handleAddSender = () => {
    if (senders.length >= 20) return;
    const nextIdx = senders.length + 1;
    const newId = `Alice-${nextIdx}`;
    const newSender: SenderConfig = {
      id: newId,
      name: `Alice-${nextIdx}`,
      channelLoss: parseFloat((2 + Math.random() * 15).toFixed(1)),
      noise: parseFloat((0.01 + Math.random() * 0.15).toFixed(3)),
      detectorEfficiency: parseFloat((0.70 + Math.random() * 0.25).toFixed(2)),
      darkCounts: parseFloat((0.0002 + Math.random() * 0.003).toFixed(5)),
      misalignment: parseFloat((0.5 + Math.random() * 10).toFixed(1)),
      numBits: 1000
    };
    setSenders([...senders, newSender]);
    setActiveSenderId(newId);
  };

  // Remove sender
  const handleRemoveSender = (id: string) => {
    if (senders.length <= 2) return;
    const updated = senders.filter(s => s.id !== id);
    setSenders(updated);
    if (activeSenderId === id) {
      setActiveSenderId(updated[0].id);
    }
  };

  // Update a parameter
  const handleUpdateParam = (id: string, key: keyof SenderConfig, value: any) => {
    const updated = senders.map(s => {
      if (s.id === id) {
        return { ...s, [key]: value };
      }
      return s;
    });
    setSenders(updated);
  };

  // CSV Export
  const handleExportCSV = async () => {
    try {
      const res = await fetch("/api/multi_sender/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "multi_sender_qkd_dataset.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  // CSV Import
  const handleImportCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split("\n");
        if (lines.length < 2) {
          throw new Error("CSV has no data rows");
        }
        
        // Parse headers
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const importedSenders: SenderConfig[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(",");
          if (parts.length < 5) continue;

          // Simple dynamic mapping based on header names or order
          const senderName = parts[0] ? parts[0].replaceAll('"', '') : `Alice-${i}`;
          const channelLoss = parseFloat(parts[1]) || 5.0;
          const noise = parseFloat(parts[2]) || 0.05;
          const detectorEfficiency = parseFloat(parts[3]) || 0.85;
          const darkCounts = parseFloat(parts[4]) || 0.001;
          const misalignment = parseFloat(parts[5]) || 0.0;
          const numBits = 1000;

          importedSenders.push({
            id: `Alice-${i}`,
            name: senderName,
            channelLoss,
            noise,
            detectorEfficiency,
            darkCounts,
            misalignment,
            numBits
          });
        }

        if (importedSenders.length < 2) {
          throw new Error("Need at least 2 senders in the CSV file");
        }

        setSenders(importedSenders.slice(0, 20));
        setActiveSenderId(importedSenders[0].id);
        setResults(null);
        setImportError(null);
      } catch (err: any) {
        setImportError(err.message || "Failed to parse QKD CSV file.");
      }
    };
    reader.readAsText(file);
  };

  // Printable report triggering browser printing
  const handlePrint = () => {
    window.print();
  };

  // Senders list sorted for charts
  const chartData = results ? results.senders.map(s => ({
    name: s.name,
    "Actual QBER (%)": parseFloat(((s.actualQber || 0) * 100).toFixed(2)),
    "Predicted QBER (%)": parseFloat(((s.predictedQber || 0) * 100).toFixed(2)),
    "Confidence (%)": s.confidence || 90.0,
    "Channel Loss (dB)": s.channelLoss,
    "Noise (%)": parseFloat((s.noise * 100).toFixed(2)),
    "Detector Eff (%)": parseFloat((s.detectorEfficiency * 100).toFixed(2)),
    "Rank": s.rank || 1,
  })).sort((a, b) => a.Rank - b.Rank) : senders.map(s => ({
    name: s.name,
    "Actual QBER (%)": 0,
    "Predicted QBER (%)": 0,
    "Confidence (%)": 0,
    "Channel Loss (dB)": s.channelLoss,
    "Noise (%)": parseFloat((s.noise * 100).toFixed(2)),
    "Detector Eff (%)": parseFloat((s.detectorEfficiency * 100).toFixed(2)),
    "Rank": 1,
  }));

  const activeSender = senders.find(s => s.id === activeSenderId) || senders[0];

  return (
    <div id="multi-sender-view" className="space-y-6 text-white pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[9px] font-bold border border-cyan-500/20 uppercase tracking-widest">
              Advanced Module
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-400 font-mono">QKD NETWORK MATRIX</span>
          </div>
          <h2 className="text-xl font-sans font-extrabold tracking-tight text-white mt-1">
            Multi-Sender QKD Prediction Framework
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Distribute cryptographic key generation across up to 20 spatial locations. Simulate independent channels, calculate QBER physical states, and leverage the Random Forest regressor to select the best route.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-2 transition duration-300 cursor-pointer"
            title="Import custom multi-sender configuration CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            Import CSV
          </button>
          
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-2 transition duration-300 cursor-pointer"
            title="Export all multi-sender states to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export CSV
          </button>

          <button
            onClick={handleReset}
            className="px-3.5 py-2 bg-rose-900/10 hover:bg-rose-950/30 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-bold uppercase tracking-wider transition duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={handleRunAll}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl bg-cyan-500 text-[#050810] hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:bg-cyan-900/50 disabled:text-cyan-600 transition duration-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-cyan-950 border-t-transparent rounded-full animate-spin" />
                SIMULATING CORE...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-[#050810]" />
                RUN ALL SIMULATIONS
              </>
            )}
          </button>
        </div>
      </div>

      {importError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Error parsing CSV: {importError}</span>
        </div>
      )}

      {/* Results Telemetry Dashboard Card */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Senders Card */}
        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest block">Total Senders</span>
          <div className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            {senders.length}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">COMMUNICATIONS CAP</span>
        </div>

        {/* Best Sender */}
        <div className="p-4 bg-gradient-to-br from-cyan-950/20 to-slate-950/40 border border-cyan-500/10 rounded-2xl space-y-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <span className="text-[10px] font-mono font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-spin" />
            Optimal Path
          </span>
          <div className="text-lg font-bold text-white truncate">
            {results ? results.analytics.bestSender.name : "Alice-1"}
          </div>
          <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
            QBER: {results ? `${(results.analytics.bestSender.predictedQber * 100).toFixed(2)}%` : "0.00%"}
          </span>
        </div>

        {/* Worst Sender */}
        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest block font-bold">Worst Path</span>
          <div className="text-lg font-bold text-slate-300 truncate">
            {results ? results.analytics.worstSender.name : "Alice-3"}
          </div>
          <span className="text-[9px] text-rose-400 font-mono block">
            QBER: {results ? `${(results.analytics.worstSender.predictedQber * 100).toFixed(2)}%` : "0.00%"}
          </span>
        </div>

        {/* Average QBER */}
        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest block font-bold">Average QBER</span>
          <div className="text-2xl font-extrabold text-white font-mono">
            {results ? `${(results.analytics.averageQber * 100).toFixed(2)}%` : "0.00%"}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">
            THRESHOLD MAX 11%
          </span>
        </div>

        {/* Network Health Score */}
        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1 col-span-2 md:col-span-1">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest block font-bold">Network Health</span>
          <div className="text-2xl font-extrabold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            {results ? `${results.analytics.networkHealthScore}%` : "100%"}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">
            STABILIZED TRANSIT
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Average Channel Loss */}
        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest block font-bold">Average Channel Loss</span>
          <div className="text-xl font-bold text-slate-200 font-mono">
            {results ? `${results.analytics.averageChannelLoss} dB` : "8.5 dB"}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">FIBER COUPLING LOSS</span>
        </div>

        {/* Secure Communication Percentage */}
        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest block font-bold font-bold">Secure Path Ratio</span>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {results ? `${results.analytics.secureCommunicationPercentage}%` : "66%"}
          </div>
          <span className="text-[9px] text-slate-400 font-mono block">PASSED SECURITY CHECKS</span>
        </div>

        {/* Highest QBER */}
        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest block font-bold font-bold">Peak QBER</span>
          <div className="text-xl font-bold text-rose-400 font-mono">
            {results ? `${(results.analytics.highestQber * 100).toFixed(2)}%` : "12.0%"}
          </div>
          <span className="text-[9px] text-rose-500/80 font-mono block">CRITICAL THREAT INDEX</span>
        </div>

        {/* Lowest QBER */}
        <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest block font-bold font-bold">Lowest QBER</span>
          <div className="text-xl font-bold text-cyan-400 font-mono">
            {results ? `${(results.analytics.lowestQber * 100).toFixed(2)}%` : "1.8%"}
          </div>
          <span className="text-[9px] text-cyan-500/80 font-mono block">OPTIMAL TRANSIT INDEX</span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand: Visualizer / Charts Container */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section Mode Toggle */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("visualizer")}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-300 cursor-pointer ${
                activeTab === "visualizer"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Animated Quantum Visualizer
            </button>
            <button
              onClick={() => setActiveTab("charts")}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-300 cursor-pointer ${
                activeTab === "charts"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Network Comparative Charts
            </button>
            <button
              onClick={() => setActiveTab("report")}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition duration-300 cursor-pointer ${
                activeTab === "report"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Cryptographic Audit PDF
            </button>
          </div>

          {activeTab === "visualizer" && (
            <div className="p-6 bg-slate-950/40 border border-white/10 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Live Optical Path Topology
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Real-time fiber paths from multi-senders Alice₁.. Aliceₙ. Colors match independent lasers. Red waves indicate noise/polarization drifts.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">Interactive Laser Core</span>
                </div>
              </div>

              {/* Quantum Network Visualization Stage */}
              <div className="relative h-96 bg-[#04060f]/90 border border-white/5 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                
                {/* SVG Drawing Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Define filters */}
                  <defs>
                    <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="glow-best" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Lines between Senders and Bob */}
                  {senders.map((s, idx) => {
                    const total = senders.length;
                    const yStart = 40 + ((idx / (total - 1 || 1)) * 312);
                    const isBest = results && results.bestSenderId === s.id;
                    const color = colors[idx % colors.length];

                    return (
                      <g key={s.id}>
                        {/* Dynamic Laser Line */}
                        <line
                          x1="15%"
                          y1={`${yStart}`}
                          x2="85%"
                          y2="50%"
                          stroke={color}
                          strokeWidth={isBest ? 3 : 1}
                          strokeOpacity={isBest ? 0.9 : 0.3}
                          className={isBest ? "animate-pulse" : ""}
                          filter={isBest ? "url(#glow-best)" : "url(#glow-cyan)"}
                        />

                        {/* Photon stream particle generator (SVG pure CSS animation approximation) */}
                        <circle cx="15%" cy={`${yStart}`} r="3.5" fill={color}>
                          <animateMotion
                            path={`M 0 0 L ${0.7 * 800} ${192 - yStart}`}
                            dur={`${2 + (s.channelLoss / 10)}s`}
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Noisy photon particle (red wave) if noise probability is high */}
                        {s.noise > 0.05 && (
                          <circle cx="15%" cy={`${yStart}`} r="3" fill="#f43f5e" opacity="0.8">
                            <animateMotion
                              path={`M 0 0 L ${0.7 * 800} ${192 - yStart}`}
                              dur={`${1.2 + (s.channelLoss / 8)}s`}
                              repeatCount="indefinite"
                              begin="0.5s"
                            />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Senders Left Column (HTML positioning on top of SVG) */}
                <div className="absolute left-4 top-4 bottom-4 flex flex-col justify-between w-40 z-10 font-sans">
                  {senders.map((s, idx) => {
                    const isBest = results && results.bestSenderId === s.id;
                    const isSelected = activeSenderId === s.id;
                    const color = colors[idx % colors.length];

                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSenderId(s.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition duration-300 cursor-pointer flex flex-col gap-1 w-full relative ${
                          isSelected
                            ? "bg-slate-900 border-white/30 shadow-lg"
                            : "bg-slate-950/70 border-white/5 hover:border-white/10"
                        }`}
                        style={{
                          boxShadow: isBest ? `0 0 15px ${color}30` : undefined,
                          borderColor: isBest ? color : undefined
                        }}
                      >
                        {isBest && (
                          <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded bg-emerald-500 text-[#050810] font-mono font-extrabold text-[8px] tracking-wider uppercase scale-90">
                            BEST
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-bold text-white truncate">{s.name}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono flex flex-wrap justify-between gap-1">
                          <span>Loss: {s.channelLoss}dB</span>
                          <span>Noise: {Math.round(s.noise * 100)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Receiver Node on the Right */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 border border-white/20 shadow-[0_0_25px_rgba(6,182,212,0.4)] flex flex-col items-center justify-center relative animate-pulse">
                    <span className="text-[9px] font-mono font-black text-cyan-100 tracking-widest uppercase">REC</span>
                    <span className="text-sm font-bold text-white tracking-tighter">BOB</span>
                    {/* Pulsing signal halo */}
                    <div className="absolute inset-0 border-2 border-cyan-400 rounded-2xl animate-ping opacity-25" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">Node Receiver Bob</span>
                  <div className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                    Aetheris core
                  </div>
                </div>

                {/* Legend Box at the bottom */}
                <div className="absolute bottom-3 right-3 left-3 flex justify-between items-center text-[9px] font-mono text-slate-500 bg-slate-950/80 p-2.5 border border-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Active Fiber Channel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-rose-500 animate-ping" />
                    <span>Flipping Photons (Noise)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1 py-0.2 bg-emerald-500 text-[#050810] rounded text-[8px] font-black uppercase">BEST PATH</span>
                    <span>Lowest Predicted QBER</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "charts" && (
            <div className="p-6 bg-slate-950/40 border border-white/10 rounded-2xl space-y-6">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Comparative Network Analytics Charts
                </h3>
                <p className="text-[11px] text-slate-500">
                  Performance matrices across all communicating terminals.
                </p>
              </div>

              {/* Chart 1: Predicted vs Actual QBER */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  Predicted vs Actual QBER by Communicator (Threshold: 11%)
                </h4>
                <div className="h-64 bg-slate-900/50 p-4 border border-white/5 rounded-xl">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="name" tick={{ fill: '#8f9bba', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#8f9bba', fontSize: 10 }} domain={[0, 'auto']} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0B1020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Actual QBER (%)" fill="#a855f7" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Predicted QBER (%)" fill="#06b6d4" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Channel Loss and Noise Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300">
                    Channel Attenuation Comparison (dB)
                  </h4>
                  <div className="h-48 bg-slate-900/50 p-4 border border-white/5 rounded-xl">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="name" tick={{ fill: '#8f9bba', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#8f9bba', fontSize: 9 }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#0B1020', border: 'none' }} />
                        <Bar dataKey="Channel Loss (dB)" fill="#06b6d4" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300">
                    Channel Noise Jitter Probability (%)
                  </h4>
                  <div className="h-48 bg-slate-900/50 p-4 border border-white/5 rounded-xl">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="name" tick={{ fill: '#8f9bba', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#8f9bba', fontSize: 9 }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#0B1020', border: 'none' }} />
                        <Bar dataKey="Noise (%)" fill="#ec4899" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "report" && (
            <div id="printable-qkd-audit" className="p-8 bg-[#090D1A] border-2 border-cyan-500/20 rounded-2xl space-y-6 shadow-2xl relative">
              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <Network className="w-96 h-96 text-cyan-400" />
              </div>

              {/* Print Header */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4 relative z-10">
                <div>
                  <h3 className="text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    AETHERIS-QKD SYSTEM INTEGRATION
                  </h3>
                  <h4 className="text-lg font-sans font-extrabold text-white">
                    Multi-Sender Cryptographic Channel Audit
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    REGULATION POSTURE ID: {Math.floor(Date.now() / 10000)} • CONFIDENTIAL CLASS 4
                  </p>
                </div>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-cyan-500 text-[#050810] hover:bg-cyan-400 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition duration-300 print:hidden cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Print PDF Report
                </button>
              </div>

              {/* Recommendation summary card */}
              <div className="p-5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-3 relative z-10">
                <h5 className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  EXECUTIVE SECURE ROUTE CERTIFICATE
                </h5>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {results ? results.recommendationReasoning : "No simulation run conducted. Run simulation to trigger cryptographic certification."}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-500 block">OPTIMAL GATEWAY</span>
                    <span className="text-cyan-400 font-bold">{results ? results.analytics.bestSender.name : "Alice-1"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">ESTIMATED QBER</span>
                    <span className="text-emerald-400 font-bold">{results ? `${(results.analytics.bestSender.predictedQber * 100).toFixed(2)}%` : "0.00%"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">NETWORK COHERENCE</span>
                    <span className="text-white font-bold">{results ? `${results.analytics.networkHealthScore}%` : "100%"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">DATE GENERATED</span>
                    <span className="text-slate-400 font-bold">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Audit table */}
              <div className="space-y-2 relative z-10">
                <h5 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Optical Terminal Posture Index
                </h5>
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="border-b border-white/10 text-[9px] font-mono text-slate-500 uppercase">
                      <th className="py-2 px-3">Rank</th>
                      <th className="py-2 px-3">Sender ID</th>
                      <th className="py-2 px-3">Channel Loss</th>
                      <th className="py-2 px-3">Noise Jitter</th>
                      <th className="py-2 px-3">Actual QBER</th>
                      <th className="py-2 px-3">Predicted QBER</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {senders.map((s, idx) => {
                      const isBest = results && results.bestSenderId === s.id;
                      return (
                        <tr key={s.id} className={isBest ? "bg-cyan-500/5 font-semibold" : ""}>
                          <td className="py-2.5 px-3 font-mono text-cyan-400">#{results && s.rank ? s.rank : idx + 1}</td>
                          <td className="py-2.5 px-3 text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                            {s.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{s.channelLoss} dB</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{(s.noise * 100).toFixed(1)}%</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{s.actualQber ? `${(s.actualQber * 100).toFixed(2)}%` : "N/A"}</td>
                          <td className="py-2.5 px-3 font-mono text-cyan-300">{s.predictedQber ? `${(s.predictedQber * 100).toFixed(2)}%` : "N/A"}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                              s.communicationStatus === "Secure" 
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                : s.communicationStatus === "Moderate Risk"
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                  : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                            }`}>
                              {s.communicationStatus || "N/A"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom legal notice */}
              <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:justify-between gap-4 text-[9px] text-slate-500 font-mono relative z-10">
                <p>CERTIFIED CRYPTOGRAPHER CORE ID: AES_8281</p>
                <p>© Aetheris Core Labs. All physical and theoretical security boundaries certified under Shor-Preskill.</p>
              </div>
            </div>
          )}

        </div>

        {/* Right Hand: Interactive Controls Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-slate-950/40 border border-white/10 rounded-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Network Congestion Config
              </h3>
              <div className="flex items-center gap-2">
                <button
                  disabled={senders.length <= 2}
                  onClick={() => handleRemoveSender(senders[senders.length - 1].id)}
                  className="p-1 rounded bg-slate-900 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold font-mono">{senders.length} Senders</span>
                <button
                  disabled={senders.length >= 20}
                  onClick={handleAddSender}
                  className="p-1 rounded bg-cyan-500 text-[#050810] hover:bg-cyan-400 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Selector list */}
            <div className="flex flex-wrap gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
              {senders.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSenderId(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition duration-300 cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeSenderId === s.id
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                  {s.name}
                </button>
              ))}
            </div>

            {/* Individual active sender slider matrix */}
            <div className="space-y-4 pt-1 bg-[#050810]/50 p-4 border border-white/5 rounded-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[senders.findIndex(s => s.id === activeSenderId) % colors.length] }} />
                  <input
                    type="text"
                    value={activeSender.name}
                    onChange={(e) => handleUpdateParam(activeSenderId, "name", e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-400 font-bold text-xs text-white uppercase tracking-wider py-0.5 px-1 outline-none w-32"
                  />
                </div>
                <button
                  disabled={senders.length <= 2}
                  onClick={() => handleRemoveSender(activeSenderId)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1 uppercase bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  DELETE
                </button>
              </div>

              {/* 1. Channel Loss (dB) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    Channel Attenuation
                    <Info className="w-3 h-3 text-slate-500 hover:text-cyan-400 cursor-help" title="Loss of photon strength as it travels. High values increase lost count." />
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{activeSender.channelLoss} dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={activeSender.channelLoss}
                  onChange={(e) => handleUpdateParam(activeSenderId, "channelLoss", parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* 2. Noise Jitter Probability */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    Channel Noise Jitter
                    <Info className="w-3 h-3 text-slate-500 hover:text-cyan-400 cursor-help" title="Environmental fiber temperature and geometric perturbation drifts." />
                  </span>
                  <span className="font-mono text-pink-300 font-bold">{(activeSender.noise * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={activeSender.noise}
                  onChange={(e) => handleUpdateParam(activeSenderId, "noise", parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>

              {/* 3. Detector Efficiency */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Detector Efficiency</span>
                  <span className="font-mono text-purple-300 font-bold">{(activeSender.detectorEfficiency * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={activeSender.detectorEfficiency}
                  onChange={(e) => handleUpdateParam(activeSenderId, "detectorEfficiency", parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* 4. Dark Count Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Dark Count Interference</span>
                  <span className="font-mono text-amber-300 font-bold">{(activeSender.darkCounts * 100).toFixed(3)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.02"
                  step="0.0001"
                  value={activeSender.darkCounts}
                  onChange={(e) => handleUpdateParam(activeSenderId, "darkCounts", parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* 5. Polarization Misalignment */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Polarization Misalignment</span>
                  <span className="font-mono text-emerald-300 font-bold">{activeSender.misalignment}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  step="0.5"
                  value={activeSender.misalignment}
                  onChange={(e) => handleUpdateParam(activeSenderId, "misalignment", parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
            
            <button
              onClick={handleRunAll}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 border border-[#06b6d4]/30 text-cyan-300 transition duration-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              Analyze Active Matrix
            </button>
          </div>
        </div>

      </div>

      {/* Comparison Matrix & Optimal Recommendation Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Comparison Matrix Table */}
        <div className="lg:col-span-8 p-6 bg-slate-950/40 border border-white/10 rounded-2xl space-y-4">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
              Live Comparative QBER & Recommendation Ledger
            </h3>
            <p className="text-[11px] text-slate-500">
              Complete catalog tracking optical loss constraints, error rates, and final classification scores.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-mono text-slate-500 uppercase tracking-widest bg-white/[0.01]">
                  <th className="py-2.5 px-4 font-semibold">Rank</th>
                  <th className="py-2.5 px-4 font-semibold">Sender Name</th>
                  <th className="py-2.5 px-4 font-semibold">Actual QBER</th>
                  <th className="py-2.5 px-4 font-semibold">Predicted QBER</th>
                  <th className="py-2.5 px-4 font-semibold">ML Confidence</th>
                  <th className="py-2.5 px-4 font-semibold">Status Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {senders.map((s, idx) => {
                  const isBest = results && results.bestSenderId === s.id;
                  const color = colors[idx % colors.length];

                  return (
                    <tr 
                      key={s.id} 
                      className={`transition duration-300 ${
                        isBest 
                          ? "bg-cyan-500/10 hover:bg-cyan-500/15 border-l-2 border-cyan-400" 
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        #{results && s.rank ? s.rank : idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        {s.name}
                        {isBest && (
                          <span className="px-1.5 py-0.2 bg-emerald-500 text-[#050810] text-[7px] font-mono font-black rounded uppercase scale-90">
                            RECOMMENDED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {s.actualQber !== undefined ? `${(s.actualQber * 100).toFixed(2)}%` : "N/A"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-cyan-300">
                        {s.predictedQber !== undefined ? `${(s.predictedQber * 100).toFixed(2)}%` : "N/A"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {s.confidence !== undefined ? `${s.confidence.toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wide border ${
                          s.communicationStatus === "Secure"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : s.communicationStatus === "Moderate Risk"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                          {s.communicationStatus || "STANDBY"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Golden Optimal Path Summary */}
        <div className="lg:col-span-4 p-6 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border-2 border-cyan-500/20 rounded-2xl flex flex-col justify-between gap-5 relative overflow-hidden">
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </span>
              <div>
                <h4 className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  AI DECISION MATRIX VERDICT
                </h4>
                <h3 className="text-sm font-sans font-bold text-white leading-tight">
                  Optimal Path Recommendation
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pt-2">
              {results ? results.recommendationReasoning : "Awaiting optical pathway simulation pipeline execution. Run simulation to execute neural-path optimization algorithms."}
            </p>
          </div>

          <div className="space-y-2 relative z-10 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono">Secured Node Target:</span>
              <span className="text-white font-bold">{results ? results.analytics.bestSender.name : "Alice-1"}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono">Predicted Security Posture:</span>
              <span className="text-emerald-400 font-bold uppercase font-mono tracking-widest">SECURE PORTAL</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
