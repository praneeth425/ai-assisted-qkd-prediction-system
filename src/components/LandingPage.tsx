/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  Zap, 
  Brain, 
  Radio, 
  Database, 
  LineChart, 
  Activity, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { ActiveTab } from "../types";

interface LandingPageProps {
  onStartSimulation: () => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export default function LandingPage({ onStartSimulation, setActiveTab }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 400);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      speedX: number;
      speedY: number;
      pulseSpeed: number;
      alpha: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        color: i % 2 === 0 ? "rgba(6, 182, 212, 0.7)" : "rgba(147, 51, 234, 0.7)",
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        pulseSpeed: Math.random() * 0.05 + 0.01,
        alpha: Math.random()
      });
    }

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 400;
      }
    };

    window.addEventListener("resize", handleResize);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw gridlines (matrix look)
      ctx.strokeStyle = "rgba(59, 130, 246, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw entangled connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.12 * (1 - dist / 120)})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Bounce borders
        if (p.x < 0 || p.x > width) p.speedX *= -1;
        if (p.y < 0 || p.y > height) p.speedY *= -1;

        p.alpha += p.pulseSpeed;
        const currentAlpha = Math.abs(Math.sin(p.alpha)) * 0.6 + 0.4;

        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const features = [
    {
      title: "BB84 protocol simulation",
      desc: "Model the iconic BB84 quantum protocol. Generate polarization states, simulate basis alignment, and perform key distillation.",
      icon: Zap,
      color: "from-cyan-400 to-blue-500",
      tab: "simulation"
    },
    {
      title: "AI Prediction Core",
      desc: "Analyze quantum channel physical states using standard Machine Learning to predict Quantum Bit Error Rates (QBER).",
      icon: Brain,
      color: "from-purple-500 to-pink-500",
      tab: "prediction"
    },
    {
      title: "Channel Attenuation Analysis",
      desc: "Simulate physical atmospheric and fiber stress, mapping the interaction of optical loss and environmental noise on qubits.",
      icon: Radio,
      color: "from-emerald-400 to-teal-500",
      tab: "visualization"
    },
    {
      title: "Real-Time Visuals",
      desc: "Staggering visual models mapping photon transmission, polarization rotation, noise intrusion, and detector dark count clicking.",
      icon: Activity,
      color: "from-amber-400 to-orange-500",
      tab: "visualization"
    },
    {
      title: "Advanced Dataset Datalake",
      desc: "Review and expand structured physical transmission files, supporting CSV exports, imports, and regression model updates.",
      icon: Database,
      color: "from-indigo-400 to-purple-600",
      tab: "dataset"
    },
    {
      title: "Interactive Analytics",
      desc: "Extensive scatter charts, confusion matrices, neural-loss diagrams, and R² accuracy models evaluating machine learning.",
      icon: LineChart,
      color: "from-rose-500 to-red-500",
      tab: "analytics"
    }
  ] as const;

  return (
    <div id="landing-page" className="p-8 space-y-12 bg-transparent">
      {/* Hero Header Card */}
      <div className="relative rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-xl">
        <div className="absolute inset-0 pointer-events-none z-0">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-mono tracking-wider"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
            AI-POWERED QUANTUM CRYPTOGRAPHY PLATFORM
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight leading-[1.15]"
          >
            AI-Assisted Quantum Key Distribution <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              Performance Prediction System
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed"
          >
            Conduct advanced BB84 quantum cryptology experiments, evaluate transmission characteristics under diverse physical attenuation patterns, and analyze Quantum Bit Error Rate (QBER) safety thresholds with real-time Machine Learning prediction tools.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="pt-4 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              id="cta-start-simulation"
              onClick={onStartSimulation}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-950/40 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 group cursor-pointer"
            >
              Start BB84 Simulation
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              id="cta-view-predictor"
              onClick={() => setActiveTab("prediction")}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-slate-300 text-sm font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
            >
              Configure AI Predictor
            </button>
          </motion.div>
        </div>
      </div>

      {/* Feature Grid Section */}
      <div className="space-y-6">
        <div className="text-center md:text-left">
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight">
            Integrated System Capabilities
          </h2>
          <p className="text-xs text-slate-500">
            A look at the functional building blocks powering Aetheris Quantum core.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                onClick={() => setActiveTab(f.tab as ActiveTab)}
                className="group cursor-pointer rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-cyan-500/30 hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] backdrop-blur-xl transition-all duration-300 relative overflow-hidden"
              >
                {/* Accent Background Glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all duration-300" />
                
                <div className={`w-11 h-11 rounded-lg bg-gradient-to-tr ${f.color} flex items-center justify-center mb-4 shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <h3 className="text-sm font-sans font-semibold text-slate-200 mb-2 group-hover:text-cyan-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-cyan-400/70 font-mono group-hover:text-cyan-400 font-semibold transition-colors">
                  LAUNCH MODULE <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
