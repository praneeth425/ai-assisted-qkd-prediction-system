/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  Database, 
  Search, 
  Download, 
  Upload, 
  Sparkles, 
  Trash2,
  AlertCircle,
  ArrowDown
} from "lucide-react";
import { QKDSample } from "../types";

interface DatasetPageProps {
  dataset: QKDSample[];
  onImportCsv: (csvContent: string) => Promise<any>;
  onGenerateLargeDataset?: (count: number) => Promise<any>;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function DatasetPage({ dataset, onImportCsv, onGenerateLargeDataset, onRefresh, isLoading }: DatasetPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'core' | 'environmental' | 'performance'>('core');
  const [genCount, setGenCount] = useState(50000);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateDataset = async () => {
    if (!onGenerateLargeDataset) return;
    setIsGenerating(true);
    try {
      const res = await onGenerateLargeDataset(genCount);
      if (res && res.success) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const itemsPerPage = 12;

  // Filter items based on search term
  const filteredDataset = dataset.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.sampleId.toString().includes(term) ||
      item.channelLoss.toString().includes(term) ||
      item.actualQber.toString().includes(term) ||
      (item.experimentId && item.experimentId.toLowerCase().includes(term)) ||
      (item.channelType && item.channelType.toLowerCase().includes(term)) ||
      (item.weatherCondition && item.weatherCondition.toLowerCase().includes(term))
    );
  });

  // Pagination bounds
  const totalPages = Math.ceil(filteredDataset.length / itemsPerPage);
  const paginatedData = filteredDataset.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      setImportStatus("Importing & Retraining...");
      try {
        const res = await onImportCsv(content);
        if (res.success) {
          setImportStatus(`Successfully imported ${res.importedCount} samples. Model retrained!`);
          onRefresh();
        } else {
          setImportStatus("Import failed: invalid file structure.");
        }
      } catch (err) {
        setImportStatus("Import failed: Network or parsing error.");
      }
      setTimeout(() => setImportStatus(null), 6000);
    };
    reader.readAsText(file);
  };

  return (
    <div id="dataset-page" className="p-8 space-y-8 bg-transparent">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5.5 h-5.5 text-cyan-400" />
            Structured QKD Datalake & Dataset Registry
          </h2>
          <p className="text-xs text-slate-500">
            View historical simulations and physical channel benchmarks compiled into standard dataset matrices.
          </p>
        </div>
        <div className="flex gap-3">
          {/* CSV Download Trigger */}
          <a
            href="/api/export_dataset"
            id="btn-export-csv"
            download="qkd_prediction_dataset.csv"
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 transition-all duration-300 font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            DOWNLOAD CSV
          </a>

          {/* Import Trigger */}
          <button
            id="btn-trigger-import-csv"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-300 font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            IMPORT CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
        </div>
      </div>

      {/* CSV Status block */}
      {importStatus && (
        <div className="p-4 bg-cyan-500/10 border border-cyan-400/20 rounded-xl flex items-center gap-3 text-xs text-cyan-300 font-mono">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Dataset Volume Configurator card */}
      <div className="p-6 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/20 rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-sans font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Supermassive Research Datalake Volume Configurator
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Scale your dataset to industrial quantum-research proportions. Select a target sample count to synthesize realistic Fiber and Free-Space QKD atmospheric transmission runs under diverse physical parameters.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              SAMPLE COUNT:
            </label>
            <div className="flex gap-1 bg-[#050810]/80 p-1 border border-white/10 rounded-lg">
              {[30000, 50000, 75000, 100000].map((size) => (
                <button
                  key={size}
                  disabled={isGenerating}
                  onClick={() => setGenCount(size)}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition cursor-pointer ${
                    genCount === size
                      ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {size.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              disabled={isGenerating || isLoading}
              onClick={handleGenerateDataset}
              className={`px-5 py-2 rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-2 transition duration-300 border cursor-pointer ${
                isGenerating 
                  ? "bg-cyan-900/40 text-cyan-400 border-cyan-500/30 cursor-wait animate-pulse" 
                  : "bg-cyan-500 text-[#050810] border-cyan-400 hover:bg-cyan-400 font-bold hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  SYNTHESIZING...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  GENERATE DATASET
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informational Performance Badge */}
        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center gap-2 text-[10px] text-cyan-400 font-mono">
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-[9px] font-bold uppercase border border-cyan-500/20 shrink-0 self-start sm:self-auto">PERFORMANCE OPTIMIZER ACTIVE</span>
          <span className="text-slate-400 leading-normal">Live ML regressor fits to a representational subset (2,000 samples) to prevent server hangs, maintaining sub-second training times while loading, filtering, and plotting all {dataset.length.toLocaleString()} rows dynamically.</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-xl shadow">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by ID, channel loss (dB), experimental ID, type or actual QBER..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#050810]/60 border border-white/10 text-xs rounded-lg pl-9 pr-4 py-2.5 text-slate-300 focus:outline-none focus:border-cyan-400/50"
          />
        </div>
        
        <div className="flex gap-2 p-1 bg-[#050810]/60 border border-white/10 rounded-lg shrink-0">
          <button
            onClick={() => { setViewMode('core'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer ${
              viewMode === 'core' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            Core Physics
          </button>
          <button
            onClick={() => { setViewMode('environmental'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer ${
              viewMode === 'environmental' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            Environmental
          </button>
          <button
            onClick={() => { setViewMode('performance'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer ${
              viewMode === 'performance' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hardware & Keying
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-500 shrink-0">
          Showing {filteredDataset.length} of {dataset.length} Samples
        </span>
      </div>

      {/* Structured data table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              {viewMode === 'core' && (
                <tr className="bg-white/5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-white/10">
                  <th className="py-4 px-6">ID / EXP-ID</th>
                  <th className="py-4 px-6">Loss (dB)</th>
                  <th className="py-4 px-6">Noise (%)</th>
                  <th className="py-4 px-6">Efficiency (%)</th>
                  <th className="py-4 px-6">Dark Counts (%)</th>
                  <th className="py-4 px-6">Misalignment (°)</th>
                  <th className="py-4 px-6 text-cyan-400">Actual QBER</th>
                  <th className="py-4 px-6 text-purple-400">Predicted QBER</th>
                </tr>
              )}
              {viewMode === 'environmental' && (
                <tr className="bg-white/5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-white/10">
                  <th className="py-4 px-6">ID / EXP-ID</th>
                  <th className="py-4 px-6">Channel Type</th>
                  <th className="py-4 px-6">Distance (km)</th>
                  <th className="py-4 px-6">Weather</th>
                  <th className="py-4 px-6">Visibility (km)</th>
                  <th className="py-4 px-6">Humidity (%)</th>
                  <th className="py-4 px-6">Det Temp (°C)</th>
                  <th className="py-4 px-6 text-cyan-400">QBER Mean</th>
                </tr>
              )}
              {viewMode === 'performance' && (
                <tr className="bg-white/5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-white/10">
                  <th className="py-4 px-6">ID / EXP-ID</th>
                  <th className="py-4 px-6">Photon Intensity (μ)</th>
                  <th className="py-4 px-6">Dead Time (ns)</th>
                  <th className="py-4 px-6">Jitter (ns)</th>
                  <th className="py-4 px-6">Detected (bits)</th>
                  <th className="py-4 px-6">Sifted Length</th>
                  <th className="py-4 px-6 text-emerald-400">Key Rate (bps)</th>
                  <th className="py-4 px-6 text-cyan-400">Secure Key?</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {viewMode === 'core' && paginatedData.map((row) => (
                <tr key={row.sampleId} className="hover:bg-white/5 transition">
                  <td className="py-3 px-6 font-mono">
                    <div className="font-semibold text-cyan-400">#{row.sampleId}</div>
                    <div className="text-[10px] text-slate-500">{row.experimentId || "EXP-GENERIC"}</div>
                  </td>
                  <td className="py-3 px-6 font-mono">{row.channelLoss.toFixed(2)} dB</td>
                  <td className="py-3 px-6 font-mono">{(row.noise * 100).toFixed(2)}%</td>
                  <td className="py-3 px-6 font-mono">{(row.detectorEfficiency * 100).toFixed(0)}%</td>
                  <td className="py-3 px-6 font-mono">{(row.darkCounts * 100).toFixed(4)}%</td>
                  <td className="py-3 px-6 font-mono">{row.misalignment.toFixed(2)}°</td>
                  <td className="py-3 px-6 font-mono font-bold text-cyan-300">{(row.actualQber * 100).toFixed(2)}%</td>
                  <td className="py-3 px-6 font-mono font-bold text-purple-400">
                    {row.predictedQber !== undefined ? `${(row.predictedQber * 100).toFixed(2)}%` : "N/A"}
                  </td>
                </tr>
              ))}
              
              {viewMode === 'environmental' && paginatedData.map((row) => (
                <tr key={row.sampleId} className="hover:bg-white/5 transition">
                  <td className="py-3 px-6 font-mono">
                    <div className="font-semibold text-cyan-400">#{row.sampleId}</div>
                    <div className="text-[10px] text-slate-500">{row.experimentId || "EXP-GENERIC"}</div>
                  </td>
                  <td className="py-3 px-6 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.channelType === 'Fiber' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {row.channelType || "Fiber"}
                    </span>
                  </td>
                  <td className="py-3 px-6 font-mono">{row.transmissionDistanceKm ? row.transmissionDistanceKm.toFixed(2) : "N/A"} km</td>
                  <td className="py-3 px-6 font-mono">{row.weatherCondition || "N/A"}</td>
                  <td className="py-3 px-6 font-mono">{row.atmosphericVisibility ? row.atmosphericVisibility.toFixed(1) : "999.0"} km</td>
                  <td className="py-3 px-6 font-mono">{row.humidity ? row.humidity.toFixed(1) : "45.0"}%</td>
                  <td className="py-3 px-6 font-mono">{row.detectorTemperatureC ? `${row.detectorTemperatureC.toFixed(1)}°C` : "-45.0°C"}</td>
                  <td className="py-3 px-6 font-mono font-bold text-cyan-300">{row.QBER_mean ? `${(row.QBER_mean * 100).toFixed(2)}%` : `${(row.actualQber * 100).toFixed(2)}%`}</td>
                </tr>
              ))}

              {viewMode === 'performance' && paginatedData.map((row) => (
                <tr key={row.sampleId} className="hover:bg-white/5 transition">
                  <td className="py-3 px-6 font-mono">
                    <div className="font-semibold text-cyan-400">#{row.sampleId}</div>
                    <div className="text-[10px] text-slate-500">{row.experimentId || "EXP-GENERIC"}</div>
                  </td>
                  <td className="py-3 px-6 font-mono">{row.photonArrivalRate ? row.photonArrivalRate.toFixed(4) : "0.50"}</td>
                  <td className="py-3 px-6 font-mono">{row.detectorDeadTimeNs ? `${row.detectorDeadTimeNs.toFixed(0)} ns` : "50 ns"}</td>
                  <td className="py-3 px-6 font-mono">{row.timingJitterNs ? `${row.timingJitterNs.toFixed(3)} ns` : "0.120 ns"}</td>
                  <td className="py-3 px-6 font-mono">{row.totalDetectedBits ? row.totalDetectedBits.toLocaleString() : "N/A"}</td>
                  <td className="py-3 px-6 font-mono">{row.siftedKeyLength ? row.siftedKeyLength.toLocaleString() : "N/A"}</td>
                  <td className="py-3 px-6 font-mono font-bold text-emerald-400">
                    {row.secretKeyRate ? `${row.secretKeyRate.toLocaleString()} bps` : "0 bps"}
                  </td>
                  <td className="py-3 px-6 font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      row.secureKeyGenerated === 'Yes' ? 'bg-green-500/10 text-green-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {row.secureKeyGenerated || (row.actualQber <= 0.11 ? 'Yes' : 'No')}
                    </span>
                  </td>
                </tr>
              ))}

              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 font-mono">
                    No matching quantum telemetry records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 p-4 bg-white/5">
            <button
              id="btn-page-prev"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 font-mono font-bold uppercase tracking-wider transition cursor-pointer"
            >
              PREVIOUS
            </button>
            <span className="text-[11px] text-slate-400 font-mono font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              id="btn-page-next"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 font-mono font-bold uppercase tracking-wider transition cursor-pointer"
            >
              NEXT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
