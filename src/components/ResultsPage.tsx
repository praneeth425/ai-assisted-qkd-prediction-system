/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  FileText, 
  Sparkles, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Activity,
  ChevronRight,
  Info,
  Clock,
  Trash2
} from "lucide-react";
import { BB84SimulationResult } from "../types";

export interface HistoryItem {
  id: string;
  timestamp: number;
  parameters: {
    numBits: number;
    noiseProbability: number;
    channelLoss: number;
    detectorEfficiency: number;
    darkCountRate: number;
    basisMisalignment: number;
  };
  result: BB84SimulationResult;
  aiReport?: string;
}

interface ResultsPageProps {
  simulationResult: BB84SimulationResult | null;
  parameters: {
    numBits: number;
    noiseProbability: number;
    channelLoss: number;
    detectorEfficiency: number;
    darkCountRate: number;
    basisMisalignment: number;
  };
  onGenerateAiReport: (payload: { parameters: any; results: any }) => Promise<string>;
}

export default function ResultsPage({ simulationResult, parameters, onGenerateAiReport }: ResultsPageProps) {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewedRunId, setViewedRunId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem("qkd_simulation_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse simulation history", e);
      }
    }
  }, []);

  // Update history when a new successful simulation run completes
  useEffect(() => {
    if (simulationResult) {
      const saved = localStorage.getItem("qkd_simulation_history");
      let currentHistory: HistoryItem[] = [];
      if (saved) {
        try {
          currentHistory = JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }

      // We determine if the current active run is already saved
      const isDuplicate = currentHistory.some(item => 
        item.result.finalKeyLength === simulationResult.finalKeyLength &&
        item.result.qber === simulationResult.qber &&
        item.parameters.channelLoss === parameters.channelLoss &&
        item.parameters.noiseProbability === parameters.noiseProbability &&
        item.parameters.numBits === parameters.numBits &&
        Math.abs(item.timestamp - Date.now()) < 5000 // runs created within 5 seconds
      );

      if (!isDuplicate) {
        const newRun: HistoryItem = {
          id: `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: Date.now(),
          parameters: { ...parameters },
          result: { ...simulationResult }
        };
        const updated = [newRun, ...currentHistory].slice(0, 5);
        setHistory(updated);
        localStorage.setItem("qkd_simulation_history", JSON.stringify(updated));
        // Reset view to new active run
        setViewedRunId(null);
      }
    }
  }, [simulationResult, parameters]);

  // Sync AI Report when selecting a historical run
  const currentRun = viewedRunId 
    ? history.find(item => item.id === viewedRunId) 
    : null;

  const currentResult = currentRun ? currentRun.result : simulationResult;
  const currentParams = currentRun ? currentRun.parameters : parameters;

  useEffect(() => {
    if (viewedRunId) {
      const run = history.find(item => item.id === viewedRunId);
      setAiReport(run?.aiReport || null);
    } else {
      setAiReport(null);
    }
  }, [viewedRunId, history]);

  const handleGenerateReport = async () => {
    if (!currentResult) return;
    setIsGenerating(true);
    try {
      const report = await onGenerateAiReport({
        parameters: currentParams,
        results: currentResult
      });
      setAiReport(report);

      // Cache report in history item
      const targetId = viewedRunId || (history[0] ? history[0].id : null);
      if (targetId) {
        setHistory(prev => {
          const updated = prev.map(item => {
            if (item.id === targetId) {
              return { ...item, aiReport: report };
            }
            return item;
          });
          localStorage.setItem("qkd_simulation_history", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Safe custom Markdown-to-HTML renderer function
  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-base font-sans font-bold text-cyan-300 mt-6 mb-2 border-b border-blue-500/10 pb-1 uppercase tracking-wider">{line.slice(4)}</h3>;
      }
      if (line.startsWith("#### ")) {
        return <h4 key={idx} className="text-sm font-sans font-bold text-white mt-4 mb-2">{line.slice(5)}</h4>;
      }
      if (line.startsWith("##### ")) {
        return <h5 key={idx} className="text-xs font-sans font-bold text-cyan-400 mt-3 mb-1">{line.slice(6)}</h5>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={idx} className="text-xs text-purple-400 font-mono font-medium my-2">{line.replaceAll("**", "")}</p>;
      }
      // List items
      if (line.startsWith("* ") || line.startsWith("- ")) {
        return <li key={idx} className="text-xs text-gray-300 ml-4 list-disc my-1 leading-relaxed">{line.slice(2)}</li>;
      }
      if (line.match(/^\d+\.\s/)) {
        return <li key={idx} className="text-xs text-gray-300 ml-4 list-decimal my-1 leading-relaxed">{line.replace(/^\d+\.\s/, "")}</li>;
      }
      // Empty lines
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      // Normal paragraph
      return <p key={idx} className="text-xs text-gray-300 leading-relaxed my-1.5">{line}</p>;
    });
  };

  return (
    <div id="results-page" className="p-8 space-y-8 bg-transparent print:p-0 print:bg-white print:text-black">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5.5 h-5.5 text-cyan-400" />
            Security Audit & Academic Results Report
          </h2>
          <p className="text-xs text-slate-500">
            Generate and export printable QKD evaluation certificates compiled from physical simulation constraints and machine learning diagnostics.
          </p>
        </div>
        <div className="flex gap-3">
          {currentResult && (
            <>
              <button
                id="btn-trigger-ai-copilot"
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all duration-300 font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                {isGenerating ? "CO-PILOT ANALYZING..." : "ASK QUANTUM CO-PILOT"}
              </button>
              <button
                id="btn-print-pdf-report"
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold uppercase tracking-wider font-sans text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                DOWNLOAD PDF REPORT
              </button>
            </>
          )}
        </div>
      </div>

      {viewedRunId && currentRun && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300 font-mono print:hidden">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Viewing archived simulation run from {new Date(currentRun.timestamp).toLocaleTimeString()} ({new Date(currentRun.timestamp).toLocaleDateString()})</span>
          </div>
          <button 
            onClick={() => setViewedRunId(null)}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-sans font-bold uppercase tracking-wider rounded-lg transition duration-300 cursor-pointer"
          >
            Return to Active Run
          </button>
        </div>
      )}

      {currentResult ? (
        <div id="printable-academic-report" className="space-y-8 print:space-y-6">
          {/* Cover academic header (visible only in print or premium style) */}
          <div className="hidden print:block text-center space-y-2 border-b-2 border-slate-800 pb-6 mb-8">
            <h1 className="text-2xl font-serif font-bold text-slate-900 uppercase">
              Aetheris Quantum Key Distribution Performance Audit
            </h1>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              REPORT ID: AQKD-{Math.floor(Math.random() * 900000 + 100000)} | DATE: {new Date().toLocaleDateString()}
            </p>
            <p className="text-[10px] text-slate-400">
              Department of Quantum Informatics & Cryptology - Engineering Research Lab
            </p>
          </div>

          {/* Academic Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl flex flex-col justify-between backdrop-blur-xl print:border-slate-300 print:bg-white print:text-black">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block print:text-slate-500">
                Calculated QBER
              </span>
              <div className="my-3">
                <span className={`text-3xl font-sans font-extrabold tracking-tight print:text-slate-900 ${
                  currentResult.isSecure ? "text-cyan-400" : "text-rose-400"
                }`}>
                  {(currentResult.qber * 100).toFixed(2)}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono print:text-slate-400 leading-normal">
                Qubit error rate recorded on the reconciled key sequence. Shor-Preskill threshold is 11.0%.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl flex flex-col justify-between backdrop-blur-xl print:border-slate-300 print:bg-white print:text-black">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block print:text-slate-500">
                Secure Key Distilled
              </span>
              <div className="my-3">
                <span className="text-3xl font-sans font-extrabold text-cyan-400 tracking-tight print:text-slate-900">
                  {currentResult.finalKeyLength} Bits
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono print:text-slate-400 leading-normal">
                Final symmetric bits remaining after physical error leakage deductions and privacy amplification.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl flex flex-col justify-between backdrop-blur-xl print:border-slate-300 print:bg-white print:text-black">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block print:text-slate-500">
                Overall System Health
              </span>
              <div className="my-3">
                <span className={`text-3xl font-sans font-extrabold tracking-tight print:text-slate-900 ${
                  currentResult.isSecure ? "text-green-400" : "text-rose-500"
                }`}>
                  {currentResult.systemHealth}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono print:text-slate-400 leading-normal">
                Composite channel integrity rating incorporating noise factors, misalignment deviations, and fiber losses.
              </p>
            </div>
          </div>

          {/* Parameters / Results Side-by-Side block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
            {/* Input params card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 backdrop-blur-xl print:border-slate-300 print:bg-white">
              <h3 className="text-xs font-sans font-bold text-slate-300 uppercase tracking-widest border-b border-white/10 pb-1.5 print:text-slate-800 print:border-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400 print:text-slate-800" />
                Physical Channel Constants
              </h3>
              <div className="space-y-2 text-xs font-mono text-slate-400 print:text-slate-600">
                <div className="flex justify-between">
                  <span>Laser Output pulses:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{currentParams.numBits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Decibel Attenuation (Loss):</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{currentParams.channelLoss} dB</span>
                </div>
                <div className="flex justify-between">
                  <span>Fiber Phase/Depol Noise:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{(currentParams.noiseProbability * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Bob Detector Efficiency:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{(currentParams.detectorEfficiency * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Dark Count probability:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{(currentParams.darkCountRate * 100).toFixed(4)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Angular Misalignment:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{currentParams.basisMisalignment}°</span>
                </div>
              </div>
            </div>

            {/* Simulated output card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 backdrop-blur-xl print:border-slate-300 print:bg-white">
              <h3 className="text-xs font-sans font-bold text-slate-300 uppercase tracking-widest border-b border-white/10 pb-1.5 print:text-slate-800 print:border-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400 print:text-slate-800" />
                Measured Quantum Outcomes
              </h3>
              <div className="space-y-2 text-xs font-mono text-slate-400 print:text-slate-600">
                <div className="flex justify-between">
                  <span>Received Qubits click rate:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{currentResult.successfulDetections} pulses</span>
                </div>
                <div className="flex justify-between">
                  <span>Absorbed/Scatter losses:</span>
                  <span className="text-rose-400 print:text-slate-900 font-semibold">{currentResult.photonsLost} pulses</span>
                </div>
                <div className="flex justify-between">
                  <span>Dark Count click errors:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{currentResult.darkCounts} events</span>
                </div>
                <div className="flex justify-between">
                  <span>Reconciled Sifted Key:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{currentResult.siftedKeyLength} bits</span>
                </div>
                <div className="flex justify-between">
                  <span>Optical Link Success Rate:</span>
                  <span className="text-slate-200 print:text-slate-900 font-semibold">{(currentResult.transmissionSuccessRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantum Security Status:</span>
                  <span className={`font-bold uppercase ${currentResult.isSecure ? 'text-green-400' : 'text-rose-400'}`}>
                    {currentResult.isSecure ? 'SECURE' : 'COMPROMISED'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Co-Pilot analysis results card */}
          {aiReport ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl relative backdrop-blur-xl print:border-slate-300 print:bg-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 print:border-slate-300">
                <h3 className="text-xs font-sans font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 print:text-slate-800">
                  <Sparkles className="w-4 h-4 text-cyan-400 print:text-slate-800" />
                  Quantum security Co-Pilot audit evaluation
                </h3>
                <span className="text-[9px] font-mono text-slate-500 print:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  STABLE PREDICTION MODEL VER. 3.5
                </span>
              </div>
              <div className="prose prose-invert max-w-none space-y-2.5 text-slate-300 print:text-slate-800">
                {renderMarkdown(aiReport)}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center space-y-4 print:hidden">
              <Sparkles className="w-8 h-8 text-purple-400/40 mx-auto animate-pulse" />
              <div>
                <h4 className="text-sm font-sans font-semibold text-slate-300">Awaiting AI Security Evaluation</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">
                  Trigger our cryptographic AI assistant to conduct a comprehensive security posture and physical-channel optimization report.
                </p>
              </div>
              <button
                id="btn-trigger-ai-copilot-bottom"
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                {isGenerating ? "Analyzing..." : "Ask Quantum Co-Pilot"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center rounded-2xl bg-white/5 border border-dashed border-white/10 p-8 text-center space-y-4 shadow-inner">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
            <FileText className="w-8 h-8 text-cyan-400/50 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-semibold text-slate-200">No Historical Run Active</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-1">
              Please execute a BB84 simulation run in the BB84 Simulation tab to generate dynamic cryptographic audits.
            </p>
          </div>
        </div>
      )}

      {/* Simulation Run History & Comparison Matrix */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 shadow-xl backdrop-blur-xl print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3 gap-2">
          <div>
            <h3 className="text-xs font-sans font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Simulation Run History & Comparison Log
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Review and compare key telemetry variables across the last 5 successful simulation runs. Click "Inspect" to reload a run's detailed report.
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                localStorage.removeItem("qkd_simulation_history");
                setHistory([]);
                setViewedRunId(null);
              }}
              className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 text-rose-300 text-[10px] font-sans font-bold uppercase tracking-wider rounded-lg transition duration-300 self-start sm:self-center cursor-pointer"
            >
              Clear History
            </button>
          )}
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-white/[0.02]">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Pulses</th>
                  <th className="py-3 px-4 font-semibold">Loss</th>
                  <th className="py-3 px-4 font-semibold">Noise</th>
                  <th className="py-3 px-4 font-semibold">Misalignment</th>
                  <th className="py-3 px-4 font-semibold">QBER</th>
                  <th className="py-3 px-4 font-semibold">Symmetric Key</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((run) => {
                  const isCurrentlyViewed = viewedRunId === run.id;
                  const isCurrentlyLiveActive = !viewedRunId && simulationResult && 
                    run.result.finalKeyLength === simulationResult.finalKeyLength &&
                    run.result.qber === simulationResult.qber &&
                    run.parameters.channelLoss === parameters.channelLoss &&
                    run.parameters.numBits === parameters.numBits;
                  const isActive = isCurrentlyViewed || isCurrentlyLiveActive;

                  return (
                    <tr 
                      key={run.id} 
                      className={`transition duration-300 ${
                        isActive 
                          ? "bg-cyan-500/10 hover:bg-cyan-500/15 border-l-2 border-cyan-400" 
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="py-3 px-4 font-mono">
                        <span className="text-cyan-400 font-bold block">
                          {new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-[9px] text-slate-500 block">{new Date(run.timestamp).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{run.parameters.numBits}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{run.parameters.channelLoss.toFixed(1)} dB</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{(run.parameters.noiseProbability * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{run.parameters.basisMisalignment.toFixed(1)}°</td>
                      <td className={`py-3 px-4 font-mono font-bold ${run.result.qber > 0.11 ? 'text-rose-400' : 'text-cyan-400'}`}>
                        {(run.result.qber * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300 font-semibold">{run.result.finalKeyLength} Bits</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                          run.result.isSecure 
                            ? "bg-green-500/15 text-green-400 border border-green-500/20" 
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                        }`}>
                          {run.result.isSecure ? 'SECURE' : 'COMPROMISED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewedRunId(isCurrentlyViewed ? null : run.id)}
                            className={`px-2.5 py-1 rounded-lg font-sans text-[10px] font-bold uppercase tracking-wider transition duration-300 cursor-pointer ${
                              isCurrentlyViewed 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/35' 
                                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                            }`}
                          >
                            {isCurrentlyViewed ? 'Close' : 'Inspect'}
                          </button>
                          <button
                            onClick={() => {
                              const updated = history.filter(item => item.id !== run.id);
                              setHistory(updated);
                              localStorage.setItem("qkd_simulation_history", JSON.stringify(updated));
                              if (viewedRunId === run.id) {
                                setViewedRunId(null);
                              }
                            }}
                            className="p-1 rounded-lg bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 border border-rose-500/10 transition duration-300 cursor-pointer"
                            title="Delete run from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] p-6 text-center space-y-1">
            <Clock className="w-6 h-6 text-slate-500 mx-auto opacity-55 animate-pulse" />
            <p className="text-xs text-slate-400 font-semibold">No simulation history recorded yet</p>
            <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
              Execute a QKD photon sequence simulation inside the Simulation tab to populate comparison diagnostics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
