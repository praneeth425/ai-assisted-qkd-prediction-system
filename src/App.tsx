/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Main React Application Workspace with State Management and API Integrations.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  Zap
} from "lucide-react";

import { 
  ActiveTab, 
  BB84SimulationResult, 
  QKDSample, 
  TrainingMetrics 
} from "./types";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import LandingPage from "./components/LandingPage";
import SimulationPage from "./components/SimulationPage";
import VisualizationPage from "./components/VisualizationPage";
import PredictionPage from "./components/PredictionPage";
import DatasetPage from "./components/DatasetPage";
import AnalyticsPage from "./components/AnalyticsPage";
import ModelDetailsPage from "./components/ModelDetailsPage";
import ResultsPage from "./components/ResultsPage";
import SettingsPage from "./components/SettingsPage";
import MultiSenderPage from "./components/MultiSenderPage";
import TemporalPage from "./components/TemporalPage";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("landing");
  const [simulationResult, setSimulationResult] = useState<BB84SimulationResult | null>(null);
  
  // Track parameters of the active run to export/report correctly
  const [activeParams, setActiveParams] = useState({
    numBits: 1000,
    noiseProbability: 0.04,
    channelLoss: 3.5,
    detectorEfficiency: 0.85,
    darkCountRate: 0.001,
    basisMisalignment: 2.0
  });

  const [dataset, setDataset] = useState<QKDSample[]>([]);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [splashLoading, setSplashLoading] = useState(true);

  // Custom premium Toast Notifications state
  interface Toast {
    id: number;
    text: string;
    type: "success" | "error" | "info";
  }
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (text: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // -------------------------------------------------------------
  // Data Fetching Handlers
  // -------------------------------------------------------------
  const fetchDatasetAndMetrics = async () => {
    try {
      // 1. Fetch dataset
      const dRes = await fetch("/api/dataset");
      if (dRes.ok) {
        const dData = await dRes.json();
        setDataset(dData.dataset);
      }

      // 2. Fetch model stats
      const mRes = await fetch("/api/model_details");
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.isTrained) {
          setMetrics(mData.metrics);
        }
      }
    } catch (err) {
      console.error("Error fetching quantum records:", err);
      addToast("Failed to fetch quantum database from core.", "error");
    }
  };

  // Initial trigger
  useEffect(() => {
    const boot = async () => {
      await fetchDatasetAndMetrics();
      // Delay splash screen slightly for premium feel
      setTimeout(() => {
        setSplashLoading(false);
      }, 1200);
    };
    boot();
  }, []);

  // -------------------------------------------------------------
  // Core API Client Handlers
  // -------------------------------------------------------------
  const handleRunSimulation = async (params: typeof activeParams) => {
    setIsLoading(true);
    try {
      setActiveParams(params);
      const res = await fetch("/api/run_simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data.result);
        addToast("BB84 Quantum Cryptology simulation successfully executed!", "success");
        
        // Refresh dataset registry
        await fetchDatasetAndMetrics();
      } else {
        addToast("Error compiling photon sequence on the server.", "error");
      }
    } catch (err) {
      addToast("Error establishing link to simulation core.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredict = async (params: {
    channelLoss: number;
    noise: number;
    detectorEfficiency: number;
    darkCounts: number;
    misalignment: number;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const data = await res.json();
        addToast("ML QBER prediction calculated successfully.", "success");
        return data;
      } else {
        addToast("Error calculating ML regression predictions.", "error");
      }
    } catch (err) {
      addToast("Failed to reach predictive diagnostics server.", "error");
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const handleTrainModel = async () => {
    try {
      const res = await fetch("/api/train_model", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        addToast("Random Forest ML model trained and updated on live dataset!", "success");
        return { success: true, metrics: data.metrics };
      }
    } catch (err) {
      addToast("Failed to retrain diagnostic model.", "error");
    }
    return { success: false };
  };

  const handleImportCsv = async (csvContent: string) => {
    try {
      const res = await fetch("/api/import_dataset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent })
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        addToast(`Successfully imported ${data.importedCount} telemetry records. ML updated!`, "success");
        return { success: true, importedCount: data.importedCount };
      }
    } catch (err) {
      addToast("Failed to parse or process the imported CSV data.", "error");
    }
    return { success: false };
  };

  const handleGenerateLargeDataset = async (count: number) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/generate_large_dataset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count })
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        addToast(`Successfully generated ${data.count.toLocaleString()} research-grade QKD samples! Model retrained!`, "success");
        await fetchDatasetAndMetrics();
        return { success: true, count: data.count };
      } else {
        addToast("Error generating large dataset on the core server.", "error");
      }
    } catch (err) {
      addToast("Failed to communicate dataset generation to core server.", "error");
    } finally {
      setIsLoading(false);
    }
    return { success: false };
  };

  const handleGenerateAiReport = async (payload: { parameters: any; results: any }) => {
    try {
      const res = await fetch("/api/generate_report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        addToast("AI Cryptographic Evaluation report compiled.", "success");
        return data.report;
      }
    } catch (err) {
      addToast("Failed to compile AI co-pilot report.", "error");
    }
    return "Failed to compile security report.";
  };

  const handleResetDatabase = async () => {
    try {
      // Create empty import to trigger rebuild
      const emptyCsv = "channelLoss,noise,detectorEfficiency,darkCounts,misalignment,actualQber\n";
      const res = await fetch("/api/import_dataset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: emptyCsv })
      });
      if (res.ok) {
        addToast("Quantum datalake registry cleared successfully.", "info");
        await fetchDatasetAndMetrics();
      }
    } catch (err) {
      addToast("Error resetting datalake.", "error");
    }
  };

  const systemHealth = simulationResult ? simulationResult.systemHealth : 94;

  return (
    <div className="min-h-screen bg-[#0B1020] text-gray-100 flex font-sans relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Animated Loading Splash Screen */}
      <AnimatePresence>
        {splashLoading && (
          <motion.div
            id="splash-loading-screen"
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 bg-[#0B1020] z-50 flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse">
                <Zap className="w-9 h-9 text-white" />
              </div>
              <div className="absolute inset-0 border border-cyan-400/20 rounded-xl animate-ping" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="font-sans font-bold text-white tracking-widest text-sm uppercase">AETHERIS-QKD CORE</h2>
              <p className="font-mono text-[10px] text-cyan-400 animate-pulse uppercase tracking-widest">INITIALIZING_ML_PREDICTION_BLUEPRINTS...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cyber Grid Canvas Style Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#1a233b_0%,_#0B1020_70%)] pointer-events-none z-0" />

      {/* Main Workspace Frame */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        systemHealth={systemHealth} 
      />

      <div className="flex-1 flex flex-col min-h-screen relative z-10 overflow-x-hidden">
        <TopBar 
          systemHealth={systemHealth} 
          datasetSize={dataset.length} 
        />

        {/* Dynamic Inner Page Frame */}
        <main className="flex-1 overflow-y-auto pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              {activeTab === 'landing' && (
                <LandingPage 
                  onStartSimulation={() => setActiveTab('simulation')} 
                  setActiveTab={setActiveTab} 
                />
              )}
              {activeTab === 'simulation' && (
                <SimulationPage 
                  onRunSimulation={handleRunSimulation} 
                  isLoading={isLoading} 
                  simulationResult={simulationResult} 
                />
              )}
              {activeTab === 'visualization' && (
                <VisualizationPage 
                  simulationResult={simulationResult} 
                />
              )}
              {activeTab === 'prediction' && (
                <PredictionPage 
                  onPredict={handlePredict} 
                  onTrainModel={handleTrainModel} 
                  isLoading={isLoading} 
                />
              )}
              {activeTab === 'dataset' && (
                <DatasetPage 
                  dataset={dataset} 
                  onImportCsv={handleImportCsv} 
                  onGenerateLargeDataset={handleGenerateLargeDataset}
                  onRefresh={fetchDatasetAndMetrics} 
                  isLoading={isLoading} 
                />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsPage 
                  dataset={dataset} 
                  metrics={metrics} 
                />
              )}
              {activeTab === 'model-details' && (
                <ModelDetailsPage 
                  metrics={metrics} 
                />
              )}
              {activeTab === 'results' && (
                <ResultsPage 
                  simulationResult={simulationResult} 
                  parameters={activeParams}
                  onGenerateAiReport={handleGenerateAiReport} 
                />
              )}
              {activeTab === 'settings' && (
                <SettingsPage 
                  onResetDatabase={handleResetDatabase} 
                  onRefresh={fetchDatasetAndMetrics} 
                  datasetSize={dataset.length} 
                />
              )}
              {activeTab === 'multi-sender' && (
                <MultiSenderPage />
              )}
              {activeTab === 'temporal-analysis' && (
                <TemporalPage />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Premium custom Toast Notifications overlay */}
      <div className="fixed bottom-6 right-6 space-y-3 z-50 pointer-events-none print:hidden">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              className={`p-4 rounded-xl border flex items-start gap-3 w-80 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-auto backdrop-blur bg-[#0B1020]/95 ${
                t.type === "success" 
                  ? "border-emerald-500/30 text-emerald-300" 
                  : t.type === "error" 
                    ? "border-rose-500/30 text-rose-300" 
                    : "border-cyan-500/30 text-cyan-300"
              }`}
            >
              {t.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {t.type === "info" && <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />}
              
              <div className="space-y-1">
                <p className="text-xs font-sans font-semibold text-white leading-normal">
                  {t.type === "success" ? "Operation Successful" : t.type === "error" ? "System Failure Alert" : "Information Broadcast"}
                </p>
                <p className="text-[11px] leading-relaxed text-gray-300">{t.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
