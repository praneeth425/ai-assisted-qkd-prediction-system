/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { 
  Play, 
  Pause, 
  Info, 
  Settings, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { BB84SimulationResult, PhotonState } from "../types";

interface VisualizationPageProps {
  simulationResult: BB84SimulationResult | null;
}

export default function VisualizationPage({ simulationResult }: VisualizationPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1); // 1 = normal, 2 = fast, 0.5 = slow
  const [activeConcept, setActiveConcept] = useState<string | null>("bb84");

  // Local copy of photons for animation loop
  const photonsList = simulationResult?.photons || [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const width = (canvas.width = 1000);
    const height = (canvas.height = 450);

    // Positions of stages
    const aliceX = 120;
    const channelXStart = 200;
    const channelXEnd = 800;
    const bobX = 880;

    // Define traveling particles in canvas
    interface AnimatingPhoton {
      x: number;
      y: number;
      photon: PhotonState;
      speed: number;
      alpha: number;
      size: number;
      lossScale: number;
      isDissolved: boolean;
      sparkleAlpha: number;
    }

    const activePhotons: AnimatingPhoton[] = [];
    let photonTicker = 0;
    let currentPhotonIdx = 0;

    const renderLoop = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Static Nodes (Alice, Quantum Fiber, Bob)
      drawAtmosphere(ctx, width, height);
      drawAliceNode(ctx, aliceX, height / 2);
      drawBobNode(ctx, bobX, height / 2);
      drawChannelNode(ctx, channelXStart, channelXEnd, height / 2);

      if (photonsList.length === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.font = "font-mono 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Awaiting BB84 Simulation Data. Run simulation first.", width / 2, height / 2);
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }

      // Add a new photon based on ticker
      if (isPlaying) {
        photonTicker += 1 * speed;
        // spawn photon every 80 frames
        if (photonTicker >= 80) {
          photonTicker = 0;
          const photon = photonsList[currentPhotonIdx % photonsList.length];
          activePhotons.push({
            x: aliceX + 20,
            y: height / 2 + (Math.random() - 0.5) * 10,
            photon,
            speed: 3 * speed,
            alpha: 1,
            size: 6,
            lossScale: 1,
            isDissolved: false,
            sparkleAlpha: 0
          });
          currentPhotonIdx++;
        }
      }

      // 2. Animate and Render traveling photons
      for (let i = activePhotons.length - 1; i >= 0; i--) {
        const ap = activePhotons[i];
        
        if (isPlaying) {
          ap.x += ap.speed;
        }

        const isInsideChannel = ap.x >= channelXStart && ap.x <= channelXEnd;
        const channelMidpoint = (channelXStart + channelXEnd) / 2;

        // Loss handling: If lost, dissolve photon around mid channel
        if (ap.photon.isLost && ap.x >= channelMidpoint - 50) {
          ap.lossScale -= 0.05 * speed;
          if (ap.lossScale <= 0) {
            ap.lossScale = 0;
            ap.isDissolved = true;
          }
        }

        // Noise handling: If noisy, flash and pulse colors inside channel
        if (ap.photon.isNoisy && isInsideChannel) {
          ap.sparkleAlpha = Math.abs(Math.sin(ap.x / 10));
        }

        // Draw Photon particle
        if (!ap.isDissolved) {
          // Color coding
          // Alice basis: '+' is Cyan, 'x' is Purple
          let fillStyle = ap.photon.aliceBasis === '+' ? "rgba(34, 211, 238, 1)" : "rgba(168, 85, 247, 1)";
          let glowColor = ap.photon.aliceBasis === '+' ? "rgba(34, 211, 238, 0.5)" : "rgba(168, 85, 247, 0.5)";

          // If noisy and mid-channel, turn red-orange or mutate
          if (ap.photon.isNoisy && ap.x > channelMidpoint && ap.x < channelXEnd) {
            fillStyle = "rgba(239, 68, 68, 1)"; // Red
            glowColor = "rgba(239, 68, 68, 0.6)";
          }

          ctx.save();
          ctx.globalAlpha = ap.alpha * (ap.photon.isLost ? ap.lossScale : 1);
          
          // Outer Glow
          ctx.shadowBlur = 12;
          ctx.shadowColor = glowColor;
          ctx.fillStyle = fillStyle;
          ctx.beginPath();
          ctx.arc(ap.x, ap.y, ap.size * (ap.photon.isLost ? ap.lossScale : 1), 0, Math.PI * 2);
          ctx.fill();

          // Particle Core
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ap.x, ap.y, ap.size * 0.4 * (ap.photon.isLost ? ap.lossScale : 1), 0, Math.PI * 2);
          ctx.fill();

          // Floating bit label over photon
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`|${ap.photon.aliceBit}⟩`, ap.x, ap.y - 12);
          ctx.fillText(ap.photon.aliceBasis, ap.x, ap.y + 18);

          // Render basis misalignment indicator if present
          if (ap.photon.isNoisy && ap.x > channelMidpoint) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
            ctx.font = "bold 8px monospace";
            ctx.fillText("NOISE!", ap.x, ap.y - 22);
          }

          ctx.restore();
        }

        // Reached Bob's Receiver stage
        if (ap.x >= bobX - 10) {
          // Draw a trigger effect at Bob's end
          ctx.save();
          ctx.strokeStyle = ap.photon.isSifted 
            ? "rgba(34, 197, 94, 0.5)" // green if sifted
            : ap.photon.bobMeasuredBit === null 
              ? "rgba(239, 68, 68, 0.3)" // red if lost
              : "rgba(234, 179, 8, 0.5)"; // yellow if unmatched bases
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bobX, height / 2, 25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Flash Text overlaying Bob
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          if (ap.photon.bobMeasuredBit !== null) {
            const labelStr = `Meas: ${ap.photon.bobMeasuredBit} (B:${ap.photon.bobBasis})`;
            ctx.fillText(labelStr, bobX, height / 2 - 32);
            if (ap.photon.isSifted) {
              ctx.fillStyle = "#10b981";
              ctx.fillText("MATCH MATCH!", bobX, height / 2 + 38);
            } else {
              ctx.fillStyle = "#eab308";
              ctx.fillText("DISCARDED", bobX, height / 2 + 38);
            }
          } else if (ap.photon.isLost) {
            ctx.fillStyle = "#ef4444";
            ctx.fillText("ABSORBED", bobX, height / 2 - 32);
          }

          // remove from animating list
          activePhotons.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [photonsList, isPlaying, speed]);

  const drawAtmosphere = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Cyber Grid
    ctx.strokeStyle = "rgba(59, 130, 246, 0.02)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  const drawAliceNode = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Alice Transmitter Box
    ctx.save();
    ctx.fillStyle = "#10162A";
    ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(59, 130, 246, 0.2)";
    ctx.beginPath();
    ctx.roundRect(x - 50, y - 60, 100, 120, 10);
    ctx.fill();
    ctx.stroke();

    // Laser nozzle
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 40, y - 12, 12, 24);
    ctx.fillStyle = "rgba(6, 182, 212, 0.8)";
    ctx.fillRect(x + 52, y - 6, 4, 12);

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ALICE", x, y - 30);
    ctx.fillStyle = "rgba(6, 182, 212, 1)";
    ctx.font = "9px monospace";
    ctx.fillText("Q-ENCODER", x, y + 42);

    // Dynamic wave animation at transmitter core
    const pulse = Math.sin(Date.now() / 200) * 4 + 10;
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.beginPath();
    ctx.arc(x, y - 2, pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  const drawBobNode = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Bob Receiver Box
    ctx.save();
    ctx.fillStyle = "#10162A";
    ctx.strokeStyle = "rgba(147, 51, 234, 0.3)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(147, 51, 234, 0.2)";
    ctx.beginPath();
    ctx.roundRect(x - 50, y - 60, 100, 120, 10);
    ctx.fill();
    ctx.stroke();

    // Receiver lens
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x - 52, y - 12, 12, 24);

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOB", x, y - 30);
    ctx.fillStyle = "rgba(147, 51, 234, 1)";
    ctx.font = "9px monospace";
    ctx.fillText("SPD-ANALYZER", x, y + 42);

    // Active crosshair inside receiver core
    ctx.strokeStyle = "rgba(147, 51, 234, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x + 15, y);
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y + 15);
    ctx.stroke();

    ctx.restore();
  };

  const drawChannelNode = (ctx: CanvasRenderingContext2D, startX: number, endX: number, y: number) => {
    // Draw Fiber Line
    ctx.save();
    const grad = ctx.createLinearGradient(startX, y, endX, y);
    grad.addColorStop(0, "rgba(6, 182, 212, 0.15)");
    grad.addColorStop(0.5, "rgba(239, 68, 68, 0.1)"); // Noise zone
    grad.addColorStop(1, "rgba(147, 51, 234, 0.15)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    // Core glass line inside
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    // Labels for the physical zones
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FIBER TELECOMMUNICATION CHANNEL", (startX + endX) / 2, y - 18);
    ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
    ctx.fillText("⚠️ NOISE INTRUSION ENVIRONMENT", (startX + endX) / 2, y + 24);

    ctx.restore();
  };

  const concepts = [
    {
      id: "bb84",
      title: "BB84 Protocol",
      desc: "First proposed in 1984 by Charles Bennett and Gilles Brassard. It uses quantum states to generate a shared symmetric key between two authenticated parties (Alice and Bob) with mathematical security guarantees."
    },
    {
      id: "reconciliation",
      title: "Basis Reconciliation",
      desc: "Alice and Bob match their measurement choices. Since Bob chooses measuring bases (+ or x) randomly, they match on average 50% of the time. Non-matching bases are discarded."
    },
    {
      id: "qber",
      title: "Quantum Bit Error Rate",
      desc: "Measured error rate in the sifted key. If QBER exceeds 11%, the transmission must be discarded since an eavesdropper might have measured (and collapsed) the states, leaving trace copies."
    },
    {
      id: "loss",
      title: "Physical Fiber Loss",
      desc: "Photons dissipate as they travel in fibers. For SNSPDs, high loss isolates Bob, allowing dark counts (intrinsic detector noise) to dominate the click rate, driving up measured error rate."
    }
  ];

  return (
    <div id="visualization-page" className="p-8 space-y-8 bg-transparent">
      <div>
        <h2 className="text-xl font-sans font-semibold text-white tracking-tight">
          Physical Quantum Channel Visualizer
        </h2>
        <p className="text-xs text-slate-500">
          Observe live photon polarization travel, noise interruption, and arrival clicking.
        </p>
      </div>

      {/* Canvas wrapper */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-xl overflow-x-auto backdrop-blur-xl">
        <div className="min-w-[1000px] relative">
          <canvas ref={canvasRef} className="w-full h-[450px] bg-[#050810] rounded-xl" />
          
          {/* Legend and controls overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-auto bg-[#0B1020]/95 border border-white/10 p-3.5 rounded-xl backdrop-blur-md">
            {/* Play/Speed controllers */}
            <div className="flex items-center gap-4">
              <button
                id="btn-play-pause"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 rounded-xl font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {isPlaying ? "PAUSE ANIMS" : "PLAY ANIMS"}
              </button>

              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                <span className="text-[10px] text-slate-400 font-mono font-medium">SPEED:</span>
                <button 
                  id="btn-speed-slow"
                  onClick={() => setSpeed(0.5)} 
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${speed === 0.5 ? 'bg-cyan-400/20 text-cyan-400 font-semibold' : 'text-slate-500'}`}
                >
                  0.5x
                </button>
                <button 
                  id="btn-speed-normal"
                  onClick={() => setSpeed(1)} 
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${speed === 1 ? 'bg-cyan-400/20 text-cyan-400 font-semibold' : 'text-slate-500'}`}
                >
                  1.0x
                </button>
                <button 
                  id="btn-speed-fast"
                  onClick={() => setSpeed(2.2)} 
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${speed === 2.2 ? 'bg-cyan-400/20 text-cyan-400 font-semibold' : 'text-slate-500'}`}
                >
                  2.0x
                </button>
              </div>
            </div>

            {/* Legend indicators */}
            <div className="flex items-center gap-6 text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span>+ Basis (Rectilinear)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                <span>x Basis (Diagonal)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span>Noisy / Mutated state</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explainer Block */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-2">
          {concepts.map((c) => (
            <button
              key={c.id}
              id={`btn-concept-${c.id}`}
              onClick={() => setActiveConcept(c.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                activeConcept === c.id 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md" 
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                {c.title}
                <HelpCircle className="w-4 h-4 text-cyan-400/60" />
              </h4>
            </button>
          ))}
        </div>

        <div className="md:col-span-8 bg-white/5 border border-white/10 p-6 rounded-2xl flex items-start gap-4 shadow-lg relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-2xl" />
          <Info className="w-6 h-6 text-cyan-400 shrink-0" />
          <div className="space-y-2">
            <h3 className="text-base font-sans font-semibold text-white">
              {concepts.find((c) => c.id === activeConcept)?.title} Theory
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {concepts.find((c) => c.id === activeConcept)?.desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
