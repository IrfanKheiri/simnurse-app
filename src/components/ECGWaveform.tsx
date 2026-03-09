import React, { useEffect, useRef } from 'react';
import type { HeartRhythm } from '../types/scenario';

interface ECGWaveformProps {
  /** FIX (ISSUE-16): Waveform morphology now reflects the live patient rhythm */
  rhythm: HeartRhythm;
  pulsePresent: boolean;
}

// ─── Rhythm rendering functions ──────────────────────────────────────────────
// Each function maps a normalised x offset (0–200 repeat period) to a y delta
// relative to the midline. Positive = deflection upward (inverted in canvas coords).

/** Normal sinus P-QRS-T complex */
function sinusY(t: number, midY: number): number {
  let y = midY;
  if (t > 20 && t < 30) y -= 5;           // P wave
  else if (t >= 35 && t < 38) y += 5;     // Q dip
  else if (t >= 38 && t < 42) y -= 40;    // R spike
  else if (t >= 42 && t < 45) y += 10;    // S dip
  else if (t >= 70 && t < 90) y -= 8;     // T wave
  return y;
}

/** Bradycardia — same morphology, slower rate (wider period ~ 300 px) */
function bradycardiaY(t: number, midY: number): number {
  // Period is 300 instead of 200 — handled by caller stretching t
  return sinusY(t, midY);
}

/** SVT — fast narrow QRS, nearly no P, rapid rate (period ~100) */
function svtY(t: number, midY: number): number {
  let y = midY;
  if (t >= 30 && t < 33) y += 4;    // retrograde P
  else if (t >= 35 && t < 38) y += 3;
  else if (t >= 38 && t < 41) y -= 30;  // narrow QRS
  else if (t >= 41 && t < 44) y += 8;
  else if (t >= 55 && t < 65) y -= 5;   // T
  return y;
}

/** VTach — fast, wide, monomorphic QRS, no visible P wave */
function vtachY(t: number, midY: number): number {
  let y = midY;
  // Wide monomorphic complex spanning ~40 px per 120 period
  if (t >= 10 && t < 20) y -= 10;
  else if (t >= 20 && t < 30) y -= 35;
  else if (t >= 30 && t < 40) y += 20;
  else if (t >= 40 && t < 55) y -= 8;
  return y;
}

/** VFib — chaotic, irregular, no organised complexes */
function vfibY(t: number, midY: number, seed: number): number {
  // Use a deterministic pseudo-random based on t + seed for stable animation
  const noise = Math.sin(t * 0.7 + seed) * 18
    + Math.sin(t * 1.3 + seed * 2) * 12
    + Math.sin(t * 2.1 + seed * 0.5) * 8;
  return midY - noise;
}

/** Asystole — flat line with very occasional tiny artefact */
function asystoleY(t: number, midY: number): number {
  // Occasional micro-artefact at fixed intervals to suggest electrical silence
  if (t > 95 && t < 100) return midY - 2;
  return midY;
}

/** PEA — organised slow electrical activity with no haemodynamic output
 *  Visually shows a wide, slow QRS-like complex (no P, no T) */
function peaY(t: number, midY: number): number {
  let y = midY;
  // Very slow wide complex — looks like organised but weak activity
  if (t >= 60 && t < 70) y -= 6;
  else if (t >= 70 && t < 78) y -= 22;
  else if (t >= 78 && t < 85) y += 10;
  return y;
}

// ─── Colour map per rhythm ────────────────────────────────────────────────────
const RHYTHM_COLOUR: Record<HeartRhythm, string> = {
  Sinus:       '#10b981', // emerald
  Bradycardia: '#34d399', // lighter emerald
  SVT:         '#f59e0b', // amber
  VTach:       '#f97316', // orange
  VFib:        '#ef4444', // red
  Asystole:    '#6b7280', // grey
  PEA:         '#a78bfa', // violet
};

const RHYTHM_LABEL: Record<HeartRhythm, string> = {
  Sinus:       'Normal Sinus Rhythm',
  Bradycardia: 'Sinus Bradycardia',
  SVT:         'Supraventricular Tachycardia',
  VTach:       'Ventricular Tachycardia',
  VFib:        'Ventricular Fibrillation',
  Asystole:    'Asystole',
  PEA:         'Pulseless Electrical Activity',
};

// Repetition period in pixels per rhythm type
const RHYTHM_PERIOD: Record<HeartRhythm, number> = {
  Sinus:       200,
  Bradycardia: 320,
  SVT:         110,
  VTach:       140,
  VFib:        160,
  Asystole:    200,
  PEA:         260,
};

const ECGWaveform: React.FC<ECGWaveformProps> = ({ rhythm, pulsePresent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const seedRef = useRef(Math.random() * 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth ?? window.innerWidth;
      canvas.height = 120;
    };

    const colour = RHYTHM_COLOUR[rhythm];
    const period = RHYTHM_PERIOD[rhythm];

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Background
      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Waveform
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const points: number[] = [];
      for (let x = 0; x < width; x += 1) {
        const t = (x + offsetRef.current) % period;
        let y: number;

        switch (rhythm) {
          case 'Sinus':       y = sinusY(t, midY); break;
          case 'Bradycardia': y = bradycardiaY((t * 200) / 320, midY); break;
          case 'SVT':         y = svtY(t % 110, midY); break;
          case 'VTach':       y = vtachY(t % 140, midY); break;
          case 'VFib':        y = vfibY(t, midY, seedRef.current); break;
          case 'Asystole':    y = asystoleY(t, midY); break;
          case 'PEA':         y = peaY(t % 260, midY); break;
          default:            y = midY;
        }

        points.push(y);
      }

      ctx.moveTo(0, points[0] ?? midY);
      for (let x = 1; x < points.length; x += 1) {
        ctx.lineTo(x, points[x] ?? midY);
      }
      ctx.stroke();

      // Glow
      ctx.shadowBlur = rhythm === 'VFib' ? 6 : 10;
      ctx.shadowColor = colour;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Advance — speed varies by rhythm urgency
      const speed = rhythm === 'VFib' ? 3.5
        : rhythm === 'VTach' ? 3
        : rhythm === 'SVT' ? 2.8
        : rhythm === 'Bradycardia' ? 1.5
        : rhythm === 'Asystole' ? 1
        : rhythm === 'PEA' ? 1.8
        : 2.5;

      offsetRef.current += speed;
      requestRef.current = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    requestRef.current = requestAnimationFrame(draw);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      window.removeEventListener('resize', resize);
    };
  // Re-run whenever the rhythm changes so the waveform updates immediately
  }, [rhythm]);

  const colour = RHYTHM_COLOUR[rhythm];
  const label = RHYTHM_LABEL[rhythm];
  const isCritical = rhythm === 'VFib' || rhythm === 'VTach' || rhythm === 'Asystole';

  return (
    <div className="w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-lg mb-6">
      <canvas ref={canvasRef} className="w-full h-[120px]" />
      <div className="px-3 py-1.5 bg-slate-800/50 flex justify-between items-center">
        {/* Rhythm name with live colour indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${isCritical ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: colour }}
          />
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-wider"
            style={{ color: colour }}
          >
            {label}
          </span>
        </div>

        {/* Pulse / no pulse indicator */}
        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
          pulsePresent ? 'text-emerald-500' : 'text-red-500 animate-pulse'
        }`}>
          {pulsePresent ? 'Pulse ✓' : 'No Pulse ✗'}
        </span>
      </div>
    </div>
  );
};

export default ECGWaveform;
