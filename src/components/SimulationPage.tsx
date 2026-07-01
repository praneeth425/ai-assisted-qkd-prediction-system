/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Play, 
  RotateCcw, 
  HelpCircle, 
  Cpu, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Gauge
} from "lucide-react";
import { BB84SimulationResult } from "../types";

interface SimulationPageProps {
  onRunSimulation: (params: {
    numBits: number;
    noiseProbability: number;
    channelLoss: number;
    detectorEfficiency: number;
    darkCountRate: number;
    basisMisalignment: number;
  }) => Promise<void>;
  isLoading: boolean;
  simulationResult: BB84SimulationResult | null;
}

export default function SimulationPage({ onRunSimulation, isLoading, simulationResult }: SimulationPageProps) {
  const [numBits, setNumBits] = useState(1000);
  const [noiseProbability, setNoiseProbability] = useState(0.04);
  const [channelLoss, setChannelLoss] = useState(3.5);
  const [detectorEfficiency, setDetectorEfficiency] = useState(0.85);
  const [darkCountRate, setDarkCountRate] = useState(0.001);
  const [basisMisalignment, setBasisMisalignment] = useState(2.0);

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const tooltips: Record<string, string> = {
    numBits: "The number of raw photons encoded and sent from Alice to Bob. Higher quantities improve error statistics.",
    noiseProbability: "The probability of a polarization shift happening inside the fiber or atmospheric channel due to thermal or acoustic vibrations.",
    channelLoss: "Fiber signal loss in decibels (dB). More decibels reduce the arrival rate of photons at Bob's end, increasing the weight of dark counts.",
    detectorEfficiency: "The probability that Bob's single-photon detector (SPD) successfully registers an arriving photon.",
    darkCountRate: "The probability that Bob's detector falsely triggers (clicks) due to thermal excitation even if no signal photon arrived.",
    basisMisalignment: "The spatial orientation offset between Alice and Bob's polarization analyzers in degrees. Adds geometric QBER proportionally."
  };

  const handleRandomize = () => {
    setNumBits([200, 500, 1000, 2000][Math.floor(Math.random() * 4)]);
    setNoiseProbability(parseFloat((Math.random() * 0.15).toFixed(3)));
    setChannelLoss(parseFloat((Math.random() * 20).toFixed(1)));
    setDetectorEfficiency(parseFloat((0.7 + Math.random() * 0.28).toFixed(2)));
    setDarkCountRate(parseFloat((Math.random() * 0.01).toFixed(4)));
    setBasisMisalignment(parseFloat((Math.random() * 15).toFixed(1)));
  };

  const handleReset = () => {
    setNumBits(1000);
    setNoiseProbability(0.04);
    setChannelLoss(3.5);
    setDetectorEfficiency(0.85);
    setDarkCountRate(0.001);
    setBasisMisalignment(2.0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunSimulation({
      numBits,
      noiseProbability,
      channelLoss,
      detectorEfficiency,
      darkCountRate,
      basisMisalignment
    });
  };

  // Helper to split string into aligned squares
  const renderAlignedString = (label: string, str: string, highlightMatches: boolean = false, matchingBases: string = "") => {
    if (!str) return null;
    const array = str.split(" ");
    const matches = matchingBases.split(" ");
    
    return (
      <div className="flex items-center gap-3 py-1 border-b border-blue-500/5 hover:bg-blue-950/5 rounded px-2 transition">
        <span className="w-36 text-[10px] font-mono text-gray-400 font-medium uppercase tracking-wider">{label}</span>
        <div className="flex gap-1 overflow-x-auto select-all scrollbar-thin">
          {array.map((char, idx) => {
            const isMatch = highlightMatches && matches[idx] && matches[idx] !== " ";
            return (
              <span
                key={idx}
                className={`w-6 h-6 flex items-center justify-center font-mono text-xs rounded transition-all duration-300 ${
                  char === " " ? "bg-transparent border border-dashed border-blue-500/10" : 
                  isMatch ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 shadow-[0_0_5px_rgba(34,211,238,0.2)]" :
                  char === "∅" ? "text-rose-500 bg-rose-500/5 font-semibold" : 
                  "bg-blue-950/30 text-gray-300 border border-blue-500/10"
                }`}
              >
                {char}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div id="simulation-page" className="p-8 space-y-8">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-5.5 h-5.5 text-cyan-400" />
            BB84 Quantum Key Distribution Simulation
          </h2>
          <p className="text-xs text-gray-500">
            Configure raw quantum variables and execute the cryptographic bit reconciliation flow.
          </p>
        </div>
        <button
          id="btn-randomize-params"
          onClick={handleRandomize}
          className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-all duration-300 font-mono text-xs font-semibold flex items-center gap-1.5 self-start"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          RANDOMIZE INPUTS
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Form Control Frame (4 Cols) */}
        <div className="xl:col-span-5 space-y-6">
          <form onSubmit={handleSubmit} className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl space-y-6 relative overflow-hidden shadow-xl">
            
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 border-b border-white/10 pb-2">
              QUANTUM CHANNEL CONFIG
            </h3>

            {/* Inputs grid */}
            <div className="space-y-4">
              {/* Number of bits */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Total Photons (Bits Sent)
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'numBits' ? null : 'numBits')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{numBits}</span>
                </div>
                {activeTooltip === 'numBits' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.numBits}</p>
                )}
                <input 
                  type="range" 
                  min={100} 
                  max={3000} 
                  step={100}
                  value={numBits}
                  onChange={(e) => setNumBits(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Noise probability */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Channel Noise Probability
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'noiseProbability' ? null : 'noiseProbability')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{(noiseProbability * 100).toFixed(1)}%</span>
                </div>
                {activeTooltip === 'noiseProbability' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.noiseProbability}</p>
                )}
                <input 
                  type="range" 
                  min={0.0} 
                  max={0.3} 
                  step={0.01}
                  value={noiseProbability}
                  onChange={(e) => setNoiseProbability(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Channel Loss */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Fiber Channel Loss
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
                  max={30.0} 
                  step={0.5}
                  value={channelLoss}
                  onChange={(e) => setChannelLoss(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Detector Efficiency */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Bob Detector Efficiency
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
                  min={0.4} 
                  max={1.0} 
                  step={0.05}
                  value={detectorEfficiency}
                  onChange={(e) => setDetectorEfficiency(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Dark Count Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Dark Count Rate
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'darkCountRate' ? null : 'darkCountRate')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{(darkCountRate * 100).toFixed(3)}%</span>
                </div>
                {activeTooltip === 'darkCountRate' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.darkCountRate}</p>
                )}
                <input 
                  type="range" 
                  min={0.0} 
                  max={0.03} 
                  step={0.0005}
                  value={darkCountRate}
                  onChange={(e) => setDarkCountRate(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>

              {/* Basis Misalignment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-sans font-medium flex items-center gap-1.5">
                    Polarization Misalignment
                    <HelpCircle 
                      className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-pointer" 
                      onClick={() => setActiveTooltip(activeTooltip === 'basisMisalignment' ? null : 'basisMisalignment')}
                    />
                  </label>
                  <span className="font-mono text-xs text-cyan-400 font-semibold">{basisMisalignment.toFixed(1)}°</span>
                </div>
                {activeTooltip === 'basisMisalignment' && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded leading-relaxed border border-cyan-400/20">{tooltips.basisMisalignment}</p>
                )}
                <input 
                  type="range" 
                  min={0.0} 
                  max={45.0} 
                  step={0.5}
                  value={basisMisalignment}
                  onChange={(e) => setBasisMisalignment(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer bg-blue-950/60 rounded-lg h-1.5"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                type="button"
                id="btn-reset-simulation"
                onClick={handleReset}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 font-sans"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                RESET STATE
              </button>
              <button
                type="submit"
                id="btn-run-simulation"
                disabled={isLoading}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 font-sans shadow-lg shadow-cyan-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isLoading ? "COMPILING..." : "RUN SIMULATION"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Detail Frame (7 Cols) */}
        <div className="xl:col-span-7 space-y-6">
          {simulationResult ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl space-y-6 shadow-xl relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  MEASURED EXECUTION OUTCOMES
                </h3>
                <span className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded tracking-wider flex items-center gap-1.5 ${
                  simulationResult.isSecure 
                    ? "bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.1)]" 
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}>
                  {simulationResult.isSecure ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                      Secure Transit Mode
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                      Compromised Transit
                    </>
                  )}
                </span>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-[#050810]/40 border border-white/5 p-4 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Measured QBER</p>
                  <p className={`text-xl font-sans font-bold tracking-tight ${simulationResult.isSecure ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {(simulationResult.qber * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-[#050810]/40 border border-white/5 p-4 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Sifted Key Length</p>
                  <p className="text-xl font-sans font-bold text-white tracking-tight">{simulationResult.siftedKeyLength}</p>
                </div>
                <div className="bg-[#050810]/40 border border-white/5 p-4 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Final Key Length</p>
                  <p className="text-xl font-sans font-bold text-cyan-400 tracking-tight">{simulationResult.finalKeyLength}</p>
                </div>
                <div className="bg-[#050810]/40 border border-white/5 p-4 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Photons Absorbed</p>
                  <p className="text-xl font-sans font-bold text-rose-400 tracking-tight">{simulationResult.photonsLost}</p>
                </div>
              </div>

              {/* Physical details block */}
              <div className="text-[11px] text-slate-400 bg-white/5 p-4 rounded-xl space-y-2 border border-white/5 font-mono">
                <div className="flex justify-between">
                  <span>Successful Detections:</span>
                  <span className="text-slate-200">{simulationResult.successfulDetections} clicks</span>
                </div>
                <div className="flex justify-between">
                  <span>Dark Count Triggering:</span>
                  <span className="text-cyan-300">{simulationResult.darkCounts} events</span>
                </div>
                <div className="flex justify-between">
                  <span>Photons Arrival Rate (Loss adjusted):</span>
                  <span className="text-slate-200">{(simulationResult.transmissionSuccessRate * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Bit reconciliation details table (The first 40 photons) */}
              <div className="space-y-3">
                <h4 className="text-xs font-sans font-semibold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-1 flex items-center gap-1">
                  RECONCILIATION CHRONOLOGY
                  <span className="text-[9px] font-mono text-slate-500 font-normal lowercase">(first 40 slots)</span>
                </h4>
                <div className="space-y-2 max-w-full">
                  {renderAlignedString("Alice Bits", simulationResult.aliceBitsString)}
                  {renderAlignedString("Alice Bases", simulationResult.aliceBasesString)}
                  {renderAlignedString("Bob Bases", simulationResult.bobBasesString)}
                  {renderAlignedString("Bob Detections", simulationResult.bobMeasurementsString)}
                  {renderAlignedString("Matching Bases", simulationResult.matchingBasesString, true, simulationResult.matchingBasesString)}
                  {renderAlignedString("Sifted Key", simulationResult.siftedKeyString, true, simulationResult.matchingBasesString)}
                  {renderAlignedString("Final Secure Key", simulationResult.finalKeyString, true, simulationResult.matchingBasesString)}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-2xl bg-white/5 border border-dashed border-white/10 p-8 text-center space-y-4 shadow-inner">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                <Cpu className="w-8 h-8 text-cyan-400/50 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-sans font-semibold text-slate-200">Pending Simulation Run</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-1">
                  Configure the channel properties on the left and click 'Run Simulation' to initialize photon transmission.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-cyan-400/40 animate-pulse rotate-90 xl:rotate-0" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
