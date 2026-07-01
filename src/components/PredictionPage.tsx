/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Brain, 
  Settings, 
  HelpCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles,
  RefreshCw,
  Gauge,
  TrendingUp,
  Award
} from "lucide-react";

interface PredictionPageProps {
  onPredict: (params: {
    channelLoss: number;
    noise: number;
    detectorEfficiency: number;
    darkCounts: number;
    misalignment: number;
  }) => Promise<any>;
  onTrainModel: () => Promise<any>;
  isLoading: boolean;
}

export default function PredictionPage({ onPredict, onTrainModel, isLoading }: PredictionPageProps) {
  // Input features
  const [channelLoss, setChannelLoss] = useState(3.5);
  const [noise, setNoise] = useState(0.04);
  const [detectorEfficiency, setDetectorEfficiency] = useState(0.85);
  const [darkCounts, setDarkCounts] = useState(0.001);
  const [misalignment, setMisalignment] = useState(2.0);

  const [predictResult, setPredictResult] = useState<any>(null);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const tooltips: Record<string, string> = {
    channelLoss: "Fiber signal loss in decibels (dB). More decibels reduce signal arrival rate at Bob's end, increasing noise influence.",
    noise: "The probability of a polarization shift happening inside the channel due to environmental disturbances.",
    detectorEfficiency: "The probability that Bob's single-photon detector successfully registers an arriving photon.",
    darkCounts: "The probability that Bob's detector falsely triggers due to thermal excitation.",
    misalignment: "The spatial orientation offset between Alice and Bob's polarization analyzers in degrees."
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await onPredict({
      channelLoss,
      noise,
      detectorEfficiency,
      darkCounts,
      misalignment
    });
    setPredictResult(result);
  };

  const handleTrain = async () => {
    setTrainingStatus("TRAINING...");
    try {
      const res = await onTrainModel();
      if (res.success) {
        setTrainingStatus(`COMPLETED: R² Testing is ${res.metrics.testingAccuracy}%!`);
        setTimeout(() => setTrainingStatus(null), 5000);
      } else {
        setTrainingStatus("TRAINING_FAILED");
      }
    } catch (err) {
      setTrainingStatus("TRAINING_FAILED");
    }
  };

  const handleRandomize = () => {
    setChannelLoss(parseFloat((Math.random() * 25).toFixed(1)));
    setNoise(parseFloat((Math.random() * 0.20).toFixed(4)));
    setDetectorEfficiency(parseFloat((0.6 + Math.random() * 0.38).toFixed(2)));
    setDarkCounts(parseFloat((Math.random() * 0.02).toFixed(5)));
    setMisalignment(parseFloat((Math.random() * 20).toFixed(2)));
  };

  return (
    <div id="prediction-page" className="p-8 space-y-8">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight flex items-center gap-2">
            <Brain className="w-5.5 h-5.5 text-cyan-400" />
            Machine Learning QBER Performance Prediction
          </h2>
          <p className="text-xs text-gray-500">
            Submit physical properties of fiber links to forecast expected QBER and assess security limits before keys are transmitted.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            id="btn-randomize-pred"
            onClick={handleRandomize}
            className="px-4 py-2 rounded-lg bg-blue-950/40 border border-blue-500/15 text-gray-300 hover:text-white transition-all duration-300 font-mono text-xs font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            RANDOMIZE PROPERTIES
          </button>
          <button
            id="btn-train-ml-model"
            onClick={handleTrain}
            disabled={trainingStatus === "TRAINING..."}
            className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-300 hover:bg-purple-500/30 transition-all duration-300 font-mono text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.15)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${trainingStatus === "TRAINING..." ? "animate-spin" : ""}`} />
            {trainingStatus || "RETRAIN MODEL"}
          </button>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Input form (5 cols) */}
        <div className="xl:col-span-5">
          <form onSubmit={handlePredict} className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl space-y-6 relative overflow-hidden shadow-xl">
            
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 border-b border-white/10 pb-2">
              LINK PROPERTIES
            </h3>

            {/* Parameter adjust sliders */}
            <div className="space-y-4">
              {/* Channel Loss */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Channel Loss (dB)
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'channelLoss' ? null : 'channelLoss')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{channelLoss.toFixed(1)} dB</span>
                </div>
                {activeTooltip === 'channelLoss' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.channelLoss}</p>
                )}
                <input 
                  type="range" 
                  min={0.0} 
                  max={40.0} 
                  step={0.5}
                  value={channelLoss}
                  onChange={(e) => setChannelLoss(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Noise */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Depolarization Noise Probability
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'noise' ? null : 'noise')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{(noise * 100).toFixed(2)}%</span>
                </div>
                {activeTooltip === 'noise' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.noise}</p>
                )}
                <input 
                  type="range" 
                  min={0.0} 
                  max={0.5} 
                  step={0.01}
                  value={noise}
                  onChange={(e) => setNoise(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Detector efficiency */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Bob's Detector Efficiency
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'detectorEfficiency' ? null : 'detectorEfficiency')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{(detectorEfficiency * 100).toFixed(0)}%</span>
                </div>
                {activeTooltip === 'detectorEfficiency' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.detectorEfficiency}</p>
                )}
                <input 
                  type="range" 
                  min={0.1} 
                  max={1.0} 
                  step={0.05}
                  value={detectorEfficiency}
                  onChange={(e) => setDetectorEfficiency(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Dark Counts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Detector Dark Count Rate
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'darkCounts' ? null : 'darkCounts')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{(darkCounts * 100).toFixed(4)}%</span>
                </div>
                {activeTooltip === 'darkCounts' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.darkCounts}</p>
                )}
                <input 
                  type="range" 
                  min={0.0} 
                  max={0.05} 
                  step={0.0005}
                  value={darkCounts}
                  onChange={(e) => setDarkCounts(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Misalignment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Basis Misalignment (deg)
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'misalignment' ? null : 'misalignment')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{misalignment.toFixed(1)}°</span>
                </div>
                {activeTooltip === 'misalignment' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.misalignment}</p>
                )}
                <input 
                  type="range" 
                  min={0.0} 
                  max={45.0} 
                  step={0.5}
                  value={misalignment}
                  onChange={(e) => setMisalignment(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>
            </div>

            {/* Run prediction button */}
            <button
              type="submit"
              id="btn-trigger-prediction"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-cyan-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Brain className="w-4 h-4" />
              {isLoading ? "CALCULATING PREDICTION..." : "PREDICT CHANNEL QBER"}
            </button>
          </form>
        </div>

        {/* Right Output Panel (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          {predictResult ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl space-y-6 shadow-xl relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  AI PREDICTIVE DIAGNOSTICS
                </h3>
                <span className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded tracking-wider flex items-center gap-1.5 ${
                  predictResult.transmissionStatus === "Secure" 
                    ? "bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.1)]" 
                    : predictResult.transmissionStatus === "Warning"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                }`}>
                  {predictResult.transmissionStatus === "Secure" ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                      Secure Transit Channel
                    </>
                  ) : predictResult.transmissionStatus === "Warning" ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Warning - Elevated QBER
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                      Threat Detected (Unsafe)
                    </>
                  )}
                </span>
              </div>

              {/* Main gauge row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="bg-[#050810]/40 border border-white/5 p-5 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">Predicted QBER</p>
                  <p className={`text-3xl font-sans font-extrabold tracking-tight ${
                    predictResult.transmissionStatus === "Secure" ? 'text-cyan-400' : predictResult.transmissionStatus === "Warning" ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {(predictResult.predictedQber * 100).toFixed(2)}%
                  </p>
                </div>

                <div className="bg-[#050810]/40 border border-white/5 p-5 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">Model Confidence</p>
                  <p className="text-3xl font-sans font-extrabold text-white tracking-tight flex items-center justify-center gap-1">
                    <TrendingUp className="w-5 h-5 text-purple-400 shrink-0" />
                    {predictResult.confidence}%
                  </p>
                </div>

                <div className="bg-[#050810]/40 border border-white/5 p-5 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2">Security Verdict</p>
                  <p className={`text-base font-sans font-bold tracking-wider uppercase ${
                    predictResult.transmissionStatus === "Secure" ? 'text-green-400' : predictResult.transmissionStatus === "Warning" ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {predictResult.transmissionStatus}
                  </p>
                </div>
              </div>

              {/* Advanced Diagnostic block */}
              <div className="space-y-3 font-mono text-xs">
                <h4 className="text-xs font-sans font-semibold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-1">
                  INTERCEPT & CORRECTIONS MATRIX
                </h4>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2.5 text-slate-400">
                  <div className="flex justify-between">
                    <span>Eavesdropping Likelihood (Eve):</span>
                    <span className={predictResult.predictedQber > 0.11 ? "text-rose-400 font-bold" : "text-green-400 font-bold"}>
                      {predictResult.predictedQber > 0.11 ? "HIGH (Possible intercept-resend attack)" : "LOW (Likely optical noise only)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distillable Secure Key Capacity (GLLP):</span>
                    <span className="text-slate-200">
                      {predictResult.predictedQber > 0.11 ? "0.0% (Zero security capacity)" : `${( (1 - 2 * (-predictResult.predictedQber * Math.log2(predictResult.predictedQber || 0.001) - (1-predictResult.predictedQber)*Math.log2(1-predictResult.predictedQber || 0.001))) * 100).toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reconciliation Algorithm:</span>
                    <span className="text-cyan-300">LDPC Code (Rate 1/2) + Cascade PA</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center rounded-2xl bg-white/5 border border-dashed border-white/10 p-8 text-center space-y-4 shadow-inner">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                <Brain className="w-8 h-8 text-purple-400/50 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-sans font-semibold text-slate-200">Awaiting Physical Parameter Query</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-1">
                  Tune the fiber link properties on the left and submit to let our trained Random Forest core predict estimated QBER metrics.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
