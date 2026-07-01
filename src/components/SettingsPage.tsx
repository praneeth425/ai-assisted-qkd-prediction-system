/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  Settings, 
  ShieldAlert, 
  Cpu, 
  Database, 
  Save, 
  CheckCircle,
  AlertTriangle,
  Trash2
} from "lucide-react";

interface SettingsPageProps {
  onResetDatabase: () => void;
  onRefresh: () => void;
  datasetSize: number;
}

export default function SettingsPage({ onResetDatabase, onRefresh, datasetSize }: SettingsPageProps) {
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [selectedAlg, setSelectedAlg] = useState("random-forest");

  const handleSave = () => {
    setSaveStatus("SAVED");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div id="settings-page" className="p-8 space-y-8 bg-transparent">
      {/* Title block */}
      <div>
        <h2 className="text-xl font-sans font-semibold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5.5 h-5.5 text-cyan-400" />
          Quantum Core System Settings & Calibration
        </h2>
        <p className="text-xs text-slate-500">
          Manage system variables, recalibrate prediction engines, and purge or backup experimental datasets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* General parameters card (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-xs font-sans font-bold text-slate-300 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            AI ALGORITHM PRESETS
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">Active Prediction Core</label>
              <select
                value={selectedAlg}
                onChange={(e) => setSelectedAlg(e.target.value)}
                className="w-full bg-[#050810]/60 border border-white/10 rounded-xl text-xs p-3 text-slate-300 focus:outline-none focus:border-cyan-400/50 font-mono"
              >
                <option value="random-forest" className="bg-[#050810] text-slate-300">Random Forest Regressor (12 Bootstrapped Decision Trees) - ACTIVE</option>
                <option value="xgboost" disabled className="bg-[#050810] text-slate-500">eXtreme Gradient Boosting (XGBoost Core v2) - LICENSE REQUIRED</option>
                <option value="mlp" disabled className="bg-[#050810] text-slate-500">Multi-Layer Perceptron (Tensorflow JS Backed) - ENTERPRISE ONLY</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold block">Shor-Preskill Security Bound</label>
                <input
                  type="text"
                  value="11.0% QBER"
                  disabled
                  className="w-full bg-[#050810]/40 border border-white/5 rounded-xl text-xs p-3 text-slate-500 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold block">Error Correction Leakage factor (f)</label>
                <input
                  type="text"
                  value="1.20 (Standard Cascade/LDPC)"
                  disabled
                  className="w-full bg-[#050810]/40 border border-white/5 rounded-xl text-xs p-3 text-slate-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-white/10">
            <span className="text-[10px] font-mono text-slate-500">VERSION: 3.5.0-BETA</span>
            <button
              id="btn-save-settings"
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition duration-300 shadow-md cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saveStatus || "SAVE PRESETS"}
            </button>
          </div>
        </div>

        {/* Database administration (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6 shadow-xl relative backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl" />
          
          <h3 className="text-xs font-sans font-bold text-slate-300 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-rose-400" />
            DATALAKE CONSOLE
          </h3>

          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Currently compiling a local datalake of <span className="text-cyan-400 font-mono font-bold">{datasetSize} samples</span>.
            </p>

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
              <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal">
                Purging or resetting will wipe out all user-simulated runs and restore the datalake to the original pre-seeded benchmark layout (200 records).
              </p>
            </div>

            <button
              id="btn-reset-datalake"
              onClick={() => {
                if (window.confirm("Are you sure you want to reset the entire quantum dataset registry back to standard benchmarks? This cannot be undone.")) {
                  onResetDatabase();
                }
              }}
              className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 transition font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              RESET DATALAKE REGISTRY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
