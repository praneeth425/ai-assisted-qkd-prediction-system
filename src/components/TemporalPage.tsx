/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  History, 
  Brain, 
  Sparkles, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Save, 
  Download, 
  Gauge, 
  Sliders, 
  Clock, 
  ShieldAlert, 
  Play,
  Database
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";

interface TemporalRecord {
  timestamp: string;
  channelLoss: number;
  noise: number;
  detectorEfficiency: number;
  darkCounts: number;
  misalignment: number;
  actualQber: number;
  predictedQber: number;
}

interface ForecastStep {
  step: number;
  predictedQber: number;
  timestamp: string;
  status: string;
}

interface ForecastResult {
  futureSteps: ForecastStep[];
  confidence: number;
  stabilityScore: number;
  trend: "Improving" | "Stable" | "Degrading" | "Highly Volatile";
  alerts: { type: "info" | "warning" | "danger"; message: string }[];
}

interface EpochLoss {
  epoch: number;
  trainLoss: number;
  valLoss: number;
}

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export default function TemporalPage() {
  const [history, setHistory] = useState<TemporalRecord[]>([]);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [epochs, setEpochs] = useState<number>(30);
  const [lr, setLr] = useState<number>(0.05);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingMetrics, setTrainingMetrics] = useState<{ mae: number; mse: number; rmse: number; r2: number; epochsLoss: EpochLoss[] } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [forecastSteps, setForecastSteps] = useState<number>(10);
  const [activeMetricTab, setActiveMetricTab] = useState<"history" | "loss">("history");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Add toast notification helper
  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch data on mount and whenever external simulations update
  const loadData = async (silent: boolean = false) => {
    try {
      const historyRes = await fetch("/temporal/history");
      if (!historyRes.ok) throw new Error("Failed to fetch temporal history");
      const historyData = await historyRes.json();
      setHistory(historyData.history);

      const forecastRes = await fetch(`/temporal/forecast?steps=${forecastSteps}`);
      if (forecastRes.ok) {
        const forecastData = await forecastRes.json();
        setForecast(forecastData);
      }
      if (!silent) {
        addToast("success", "Temporal QBER historical logs and recursive projections synchronized.");
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        addToast("error", `Data Sync Error: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    loadData(true);
    // Poll every 8 seconds to automatically update when a simulation runs in another tab!
    const interval = setInterval(() => {
      loadData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [forecastSteps]);

  // Handle Model Training
  const handleTrainModel = async () => {
    setIsTraining(true);
    try {
      const res = await fetch("/temporal/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epochs, lr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Training failed");
      
      setTrainingMetrics(data.metrics);
      setActiveMetricTab("loss");
      addToast("success", `LSTM Model trained successfully over ${epochs} epochs. R² Accuracy: ${data.metrics.r2}%`);
      // Reload forecast to reflect new weights
      loadData(true);
    } catch (err: any) {
      addToast("error", `Training Error: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  // Save Model Snapshot
  const handleSaveModel = async () => {
    try {
      const res = await fetch("/temporal/save_model", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save model");
      addToast("success", "RNN/LSTM model weight snapshot backed up to persistent database.");
    } catch (err: any) {
      addToast("error", `Save Error: ${err.message}`);
    }
  };

  // Load Model Snapshot
  const handleLoadModel = async () => {
    try {
      const res = await fetch("/temporal/load_model", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load model");
      addToast("success", "RNN/LSTM weights snapshot successfully restored and loaded.");
      loadData(true);
    } catch (err: any) {
      addToast("error", `Load Error: ${err.message}`);
    }
  };

  // Formatting timestamp for scannability
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Pagination for historical table
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHistory = [...history].reverse().slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(history.length / itemsPerPage);

  // Prepare chart data for history combining actual vs predicted
  const historyChartData = history.slice(-20).map((item) => ({
    time: formatTime(item.timestamp),
    "Actual QBER": parseFloat((item.actualQber * 100).toFixed(3)),
    "Predicted QBER": parseFloat((item.predictedQber * 100).toFixed(3)),
    "Loss (dB)": item.channelLoss,
    "Noise (%)": parseFloat((item.noise * 100).toFixed(2)),
  }));

  // Prepare chart data for forecast
  const forecastChartData = forecast?.futureSteps.map((step) => ({
    "Step": `Cycle +${step.step}`,
    "Forecasted QBER": parseFloat((step.predictedQber * 100).toFixed(3)),
  })) || [];

  return (
    <div id="temporal-qber-panel" className="p-8 space-y-8 bg-[#040814] text-gray-100 min-h-screen font-sans">
      
      {/* Toast Notification HUD */}
      <div className="fixed bottom-6 right-6 space-y-3 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center gap-3 w-80 text-sm pointer-events-auto backdrop-blur bg-[#0D152D]/95 transition-all duration-300 ${
              toast.type === "success" 
                ? "border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                : toast.type === "error" 
                  ? "border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]" 
                  : "border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            }`}
          >
            {toast.type === "success" && <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />}
            {toast.type === "error" && <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />}
            {toast.type === "info" && <Brain className="w-5 h-5 shrink-0 text-cyan-400" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#0C152F] to-[#070B1C] border border-white/5 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl tracking-tight text-white">Temporal QBER Modeling</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase animate-pulse">
                LSTM Engine Active
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
              Deep recurrent network sequence-to-sequence forecasting. Learns temporal trends, optical drifts, and quantum alignment slips from historical BB84 simulations to project forthcoming transmission stability.
            </p>
          </div>
        </div>

        <button
          onClick={() => loadData(false)}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 text-xs font-mono text-cyan-400 font-medium transition duration-200 shadow-lg shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Synchronize HUD
        </button>
      </div>

      {/* 4 KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-[#090F24] border border-white/5 hover:border-cyan-500/20 transition-all duration-300 group shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Current QBER vs Forecast</p>
              <h3 className="text-2xl font-bold tracking-tight text-white mt-1">
                {history.length > 0 ? `${(history[history.length - 1].actualQber * 100).toFixed(2)}%` : "N/A"}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[11px] font-mono text-gray-400">
            <span>Projection:</span>
            <span className={forecast?.trend === "Degrading" ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {forecast?.futureSteps && forecast.futureSteps.length > 0 
                ? `${(forecast.futureSteps[0].predictedQber * 100).toFixed(2)}%` 
                : "N/A"}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">{forecast?.trend || "Stable"}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-[#090F24] border border-white/5 hover:border-indigo-500/20 transition-all duration-300 group shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Temporal Stability Score</p>
              <h3 className="text-2xl font-bold tracking-tight text-white mt-1">
                {forecast ? `${forecast.stabilityScore}/100` : "N/A"}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl ${forecast && forecast.stabilityScore > 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${forecast && forecast.stabilityScore > 75 ? "from-cyan-500 to-emerald-500" : "from-amber-500 to-rose-500"}`}
                style={{ width: `${forecast ? forecast.stabilityScore : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 font-mono mt-1.5">Based on predicted variance & threshold breaches</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-[#090F24] border border-white/5 hover:border-purple-500/20 transition-all duration-300 group shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Model Confidence Index</p>
              <h3 className="text-2xl font-bold tracking-tight text-white mt-1">
                {forecast ? `${forecast.confidence}%` : "95.0%"}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] font-mono">
            {forecast && forecast.confidence > 90 ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400">Optimal (High Context)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-400">Slightly Degraded (Train Recommended)</span>
              </>
            )}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-[#090F24] border border-white/5 hover:border-emerald-500/20 transition-all duration-300 group shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Recursive Forecast Horizon</p>
              <h3 className="text-2xl font-bold tracking-tight text-white mt-1">
                {forecastSteps} Cycles
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-gray-500">Forecast Steps:</span>
            <div className="flex items-center bg-[#070B1C] border border-white/10 rounded-lg overflow-hidden shrink-0">
              <button 
                onClick={() => setForecastSteps(5)} 
                className={`px-2 py-1 text-[10px] font-mono transition ${forecastSteps === 5 ? "bg-cyan-500/10 text-cyan-400 border-r border-white/10" : "text-gray-400 hover:text-white"}`}
              >
                5
              </button>
              <button 
                onClick={() => setForecastSteps(10)} 
                className={`px-2 py-1 text-[10px] font-mono transition ${forecastSteps === 10 ? "bg-cyan-500/10 text-cyan-400" : "text-gray-400 hover:text-white"}`}
              >
                10
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Main Bento Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3 size): Dual Visualizations and Analytics Graphs */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="p-6 bg-[#090F24] border border-white/5 rounded-2xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-cyan-500" />
                <div>
                  <h2 className="font-bold text-lg text-white">Visual Modeling & Forecast Analysis</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Dual-mode recursive trajectory and historical synchronization curves.</p>
                </div>
              </div>

              {/* Chart Tab Selection Toggle */}
              <div className="flex items-center bg-[#070B1C] border border-white/10 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setActiveMetricTab("history")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${activeMetricTab === "history" ? "bg-[#0C152F] text-cyan-400 shadow-md border border-white/5" : "text-gray-400 hover:text-white"}`}
                >
                  History Calibration
                </button>
                <button
                  onClick={() => setActiveMetricTab("loss")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${activeMetricTab === "loss" ? "bg-[#0C152F] text-cyan-400 shadow-md border border-white/5" : "text-gray-400 hover:text-white"}`}
                >
                  Training Diagnostics
                </button>
              </div>
            </div>

            {/* Display Selection */}
            <div className="h-[360px] w-full">
              {activeMetricTab === "history" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} domain={[0, 'auto']} unit="%" tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0C152F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
                      itemStyle={{ color: "#E2E8F0" }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    <ReferenceLine y={11} label={{ value: 'Shor Limit (11%)', fill: '#ef4444', position: 'top', fontSize: 10, fontFamily: 'monospace' }} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceLine y={7.5} label={{ value: 'Warning Limit (7.5%)', fill: '#f59e0b', position: 'top', fontSize: 10, fontFamily: 'monospace' }} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="Actual QBER" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Predicted QBER" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full">
                  {trainingMetrics?.epochsLoss ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trainingMetrics.epochsLoss} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0C152F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                        <Line type="monotone" dataKey="trainLoss" name="Training Loss" stroke="#06b6d4" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="valLoss" name="Validation Loss" stroke="#ec4899" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center border border-white/5 rounded-xl bg-white/[0.01]">
                      <Brain className="w-12 h-12 text-gray-600 mb-2 animate-bounce" />
                      <p className="text-sm font-mono text-gray-400">Diagnostic Loss Curve Not Yet Generated</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-1">Please configure hyper-parameters and trigger "Train Model" to record gradients.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Autoregressive Future Projections */}
          <div className="p-6 bg-[#090F24] border border-white/5 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-purple-500" />
                <div>
                  <h2 className="font-bold text-lg text-white">Multi-Step Recursive QBER Forecast</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Continuous auto-regressive prediction trajectory extending into the future horizon.</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Recursive ARIMA-RNN Cell
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Forecaster Visual Chart */}
              <div className="md:col-span-3 h-[240px]">
                {forecastChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="Step" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} domain={[0, 'auto']} unit="%" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0C152F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
                      />
                      <ReferenceLine y={11} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={7.5} stroke="#f59e0b" strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="Forecasted QBER" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#forecastGrad)" dot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <p className="text-xs font-mono text-gray-500">Awaiting forecast data...</p>
                  </div>
                )}
              </div>

              {/* Forecast Legend & Trends */}
              <div className="p-4 bg-[#070B1C] border border-white/5 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Forecast Trends</h4>
                  <div className="mt-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-400">Direction:</span>
                      <span className={`text-[11px] font-mono font-medium ${forecast?.trend === "Degrading" ? "text-rose-400" : forecast?.trend === "Improving" ? "text-emerald-400" : "text-cyan-400"}`}>
                        {forecast?.trend || "Stable"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-400">Avg QBER:</span>
                      <span className="text-[11px] font-mono text-white">
                        {forecast && forecast.futureSteps.length > 0 
                          ? `${(forecast.futureSteps.reduce((acc, s) => acc + s.predictedQber, 0) / forecast.futureSteps.length * 100).toFixed(2)}%` 
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-400">Max Peak:</span>
                      <span className="text-[11px] font-mono text-white">
                        {forecast && forecast.futureSteps.length > 0 
                          ? `${(Math.max(...forecast.futureSteps.map(s => s.predictedQber)) * 100).toFixed(2)}%` 
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-gray-500 leading-relaxed">
                  Calculated dynamically from recent drifts in channel attenuation and misalignment.
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column (1/3 size): Tuning controls, Model Persistence, and Alerts */}
        <div className="space-y-8">
          
          {/* LSTM Tuning Panel */}
          <div className="p-6 bg-[#090F24] border border-white/5 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-bold text-base text-white">Model Parameters</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">HYPER-PARAMETER CALIBRATION</p>
              </div>
            </div>

            <div className="space-y-5">
              
              {/* Slider 1: Epochs */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-medium">Training Epochs</span>
                  <span className="font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{epochs}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  disabled={isTraining}
                  className="w-full accent-cyan-500 bg-[#070B1C] rounded-lg appearance-none h-1.5 cursor-pointer disabled:opacity-40"
                />
                <p className="text-[9px] font-mono text-gray-500">More cycles yield finer alignment, but risk over-fitting.</p>
              </div>

              {/* Slider 2: Learning Rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-medium">Learning Rate (α)</span>
                  <span className="font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">{lr}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.2"
                  step="0.01"
                  value={lr}
                  onChange={(e) => setLr(Number(e.target.value))}
                  disabled={isTraining}
                  className="w-full accent-purple-500 bg-[#070B1C] rounded-lg appearance-none h-1.5 cursor-pointer disabled:opacity-40"
                />
                <p className="text-[9px] font-mono text-gray-500">Controls gradient descent convergence velocity.</p>
              </div>

              {/* Train Trigger Button */}
              <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-mono font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(6,182,212,0.25)] disabled:opacity-40"
              >
                {isTraining ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    COMPUTING BPTT GRADIENTS...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" />
                    TRAIN RECURRENT MODEL
                  </>
                )}
              </button>

            </div>
          </div>

          {/* Model Backups snapshot */}
          <div className="p-6 bg-[#090F24] border border-white/5 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Database className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-base text-white">Model Persistence</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">WEIGHT SNAPSHOT ARCHIVING</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleSaveModel}
                className="p-3 rounded-xl bg-[#0C152F] hover:bg-[#121E42] border border-[#1E2E62] text-xs font-mono text-indigo-300 flex flex-col items-center justify-center gap-2 transition duration-200"
              >
                <Save className="w-4 h-4" />
                Backup Model
              </button>
              <button
                onClick={handleLoadModel}
                className="p-3 rounded-xl bg-[#0C152F] hover:bg-[#121E42] border border-[#1E2E62] text-xs font-mono text-indigo-300 flex flex-col items-center justify-center gap-2 transition duration-200"
              >
                <Download className="w-4 h-4" />
                Restore Model
              </button>
            </div>
          </div>

          {/* Intelligent Alerts Panel */}
          <div className="p-6 bg-[#090F24] border border-white/5 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-base text-white">Security & Alerts Panel</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">INTELLIGENT TELEMETRY WATCH</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {forecast?.alerts && forecast.alerts.length > 0 ? (
                forecast.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border flex gap-3 text-xs ${
                      alert.type === "danger"
                        ? "border-rose-500/20 bg-rose-500/5 text-rose-300"
                        : alert.type === "warning"
                          ? "border-amber-500/20 bg-amber-500/5 text-amber-300"
                          : "border-cyan-500/20 bg-cyan-500/5 text-cyan-300"
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${alert.type === "danger" ? "text-rose-400" : alert.type === "warning" ? "text-amber-400" : "text-cyan-400"}`} />
                    <span className="leading-normal">{alert.message}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                  <CheckCircle className="w-8 h-8 text-emerald-500/20 mb-2 animate-pulse" />
                  <p className="text-xs font-mono">No Active Anomalies Detected</p>
                  <p className="text-[9px] text-gray-600 font-mono mt-0.5">Recurrent forecasting parameters within normal bounds.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Historical Data logs table */}
      <div className="p-6 bg-[#090F24] border border-white/5 rounded-2xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-base text-white">Quantum Simulation Historical Logs</h3>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">Chronological QKD cycles automatically recorded on execution.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Total Logs: {history.length}
          </span>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 uppercase font-mono tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Cycle Timestamp</th>
                <th className="py-3 px-4">Channel Loss</th>
                <th className="py-3 px-4">Noise Prob</th>
                <th className="py-3 px-4">Efficiency</th>
                <th className="py-3 px-4">Dark Count</th>
                <th className="py-3 px-4">Misalignment</th>
                <th className="py-3 px-4">Actual QBER</th>
                <th className="py-3 px-4">Predicted QBER</th>
                <th className="py-3 px-4">Security Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {currentHistory.map((item, index) => {
                const securityStatus = item.actualQber > 0.11 ? "Unsafe" : item.actualQber > 0.075 ? "Warning" : "Secure";
                return (
                  <tr key={index} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 text-gray-300">{formatTime(item.timestamp)} <span className="text-[10px] text-gray-500 ml-1">({new Date(item.timestamp).toLocaleDateString()})</span></td>
                    <td className="py-3 px-4">{item.channelLoss.toFixed(2)} dB</td>
                    <td className="py-3 px-4">{(item.noise * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4">{(item.detectorEfficiency * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4">{item.darkCounts.toFixed(4)}</td>
                    <td className="py-3 px-4">{item.misalignment.toFixed(2)}°</td>
                    <td className="py-3 px-4 font-semibold text-white">{(item.actualQber * 100).toFixed(3)}%</td>
                    <td className="py-3 px-4 text-purple-300 font-semibold">{(item.predictedQber * 100).toFixed(3)}%</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        securityStatus === "Secure"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : securityStatus === "Warning"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {securityStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination HUD */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <span className="text-[11px] font-mono text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-gray-300 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-gray-300 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
