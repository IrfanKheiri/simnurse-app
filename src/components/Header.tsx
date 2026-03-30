import React from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import type { AdjustableVital, PatientState } from '../types/scenario';
import { isInlineHelpSuppressed, type InlineHelpBlockers } from '../lib/inlineHelp';
import { useInlineHelpPopover } from '../hooks/useInlineHelpPopover';
import {
  formatUrgencyItemAriaLabel,
  formatUrgencyItemTitle,
  URGENCY_STRIP_HELP_EMPTY_STATE,
  URGENCY_STRIP_HELP_INTRO,
  URGENCY_STRIP_HELP_PRIORITY,
  URGENCY_STRIP_HELP_TITLE,
} from '../lib/urgencyContent';
import type { UrgencyItem, UrgencyLevel } from '../lib/urgencyContent';

// ─── Vital urgency thresholds ──────────────────────────────────────────────────
// Returns 'critical' | 'warning' | 'normal' for a given vital reading.

function hrUrgency(hr: number): 'critical' | 'warning' | 'normal' {
  if (hr < 40 || hr > 150) return 'critical';
  if (hr < 50 || hr > 120) return 'warning';
  return 'normal';
}

function spo2Urgency(spo2: number): 'critical' | 'warning' | 'normal' {
  if (spo2 < 85) return 'critical';
  if (spo2 < 92) return 'warning';
  return 'normal';
}

function bpSysUrgency(bpStr: string): 'critical' | 'warning' | 'normal' {
  const sys = parseInt(bpStr.split('/')[0] ?? '0', 10);
  if (sys < 70 || sys > 180) return 'critical';
  if (sys < 90 || sys > 160) return 'warning';
  return 'normal';
}

function rrUrgency(rr: number): 'critical' | 'warning' | 'normal' {
  if (rr < 6 || rr > 40) return 'critical';
  if (rr < 10 || rr > 30) return 'warning';
  return 'normal';
}

// ─── Decay arrow helper ──────────────────────────────────────────────────────
// Returns arrow + colour class for a per-second rate.
// Only shown when the rate magnitude is meaningful (≥ 0.01/s).

function decayArrow(ratePerSec: number | undefined): { arrow: string; cls: string } | null {
  if (ratePerSec === undefined || Math.abs(ratePerSec) < 0.01) return null;
  if (ratePerSec < 0) return { arrow: '↓', cls: 'text-red-400' };
  return { arrow: '↑', cls: 'text-green-400' };
}

// ─── Urgency strip pill colours ───────────────────────────────────────────────

const URGENCY_PILL: Record<UrgencyLevel, string> = {
  low: 'bg-slate-700 text-slate-200',
  medium: 'bg-amber-600 text-white',
  critical: 'bg-red-600 text-white animate-pulse',
};

const URGENCY_HELP_PANEL_POSITION = {
  estimatedHeight: 188,
  maxWidth: 320,
  offset: 12,
  viewportMargin: 16,
} as const;

// ─── Timer pill colour ───────────────────────────────────────────────────────

function timerPillClass(pct: number): string {
  if (pct >= 0.85) return 'bg-red-600 text-white';
  if (pct >= 0.6) return 'bg-amber-500 text-white';
  return 'bg-slate-700 text-slate-200';
}

function formatTimer(elapsedSec: number): string {
  const m = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
  const s = (elapsedSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Vital value colour (Zone B) ────────────────────────────────────────────

function vitalValueClass(tier: 'critical' | 'warning' | 'normal', unlockedColor: string): string {
  if (tier === 'critical') return 'text-red-400 animate-pulse';
  if (tier === 'warning') return 'text-amber-400';
  return unlockedColor;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  onHelpClick: () => void;
  walkthroughCompleted?: boolean;
  monitorState?: PatientState | null;
  unlocked?: Record<'hr' | 'spo2' | 'bp' | 'rr', boolean>;
  urgencyItems?: UrgencyItem[];
  vitalDecayRates?: Partial<Record<AdjustableVital, number>>;
  timerPct?: number | null;
  elapsedSec?: number;
  inlineHelpBlockers?: InlineHelpBlockers;
}

const UrgencyStripHelpToggle: React.FC<{
  suppressed?: boolean;
}> = ({ suppressed = false }) => {
  const { isOpen, panelId, panelRef, panelStyle, toggle, triggerRef } = useInlineHelpPopover({
    suppressed,
    ...URGENCY_HELP_PANEL_POSITION,
  });

  if (suppressed) {
    return null;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-describedby={isOpen ? panelId : undefined}
        aria-label="Urgency help"
        title="Explain urgency strip"
        onClick={toggle}
        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-slate-600 bg-slate-800/70 p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
      >
        <HelpCircle size={14} />
      </button>

      {isOpen && panelStyle && createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="note"
          className="fixed z-[60] rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-xl"
          style={panelStyle}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {URGENCY_STRIP_HELP_TITLE}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {URGENCY_STRIP_HELP_INTRO}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {URGENCY_STRIP_HELP_PRIORITY}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {URGENCY_STRIP_HELP_EMPTY_STATE}
          </p>
        </div>,
        document.body,
      )}
    </>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

// FIX (L23): Removed the non-functional notification bell button entirely.
// FIX (ISSUE-20): MiniMonitor merged as a second row inside this header to eliminate
// the dual-sticky-header problem. Combined header stays sticky top-0 z-50.
// REDESIGN: Three-zone MiniMonitor — timer pill + Zone B (vitals w/ urgency tiers
// + decay arrows) + UrgencyStrip (failure proximity + intervention countdowns).
const Header: React.FC<HeaderProps> = ({
  onHelpClick,
  walkthroughCompleted = true,
  monitorState = null,
  unlocked,
  urgencyItems = [],
  vitalDecayRates = {},
  timerPct = null,
  elapsedSec = 0,
  inlineHelpBlockers = {},
}) => {
  const hasMonitor = monitorState !== null && unlocked !== undefined;
  const suppressUrgencyHelp = hasMonitor && isInlineHelpSuppressed(inlineHelpBlockers);

  return (
    <header id="app-header" className="sticky top-0 z-50 flex flex-col border-b border-slate-100 bg-white">
      {/* ── Top row: logo + timer pill + help ─────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg shadow-medical-100">
            SN
          </div>
          <span className="text-sm font-black text-slate-800 tracking-tight uppercase">SimNurse</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer pill — only shown when a scenario is active */}
          {hasMonitor && timerPct !== null && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-mono font-bold tabular-nums ${timerPillClass(timerPct)}`}
              aria-label={`Scenario elapsed time ${formatTimer(elapsedSec)}`}
            >
              ⏱ {formatTimer(elapsedSec)}
            </span>
          )}

          <div className="relative">
            <button
              id="help-btn"
              onClick={onHelpClick}
              type="button"
              className="min-h-11 min-w-11 rounded-xl bg-slate-50 p-2.5 text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
              title={walkthroughCompleted ? 'Open Help' : 'Open Help (guided tour available)'}
              aria-label={walkthroughCompleted ? 'Open contextual help panel' : 'Open contextual help panel — guided tour available'}
            >
              <HelpCircle size={20} />
            </button>
            {!walkthroughCompleted && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-medical-500 ring-2 ring-white animate-pulse"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Zone B: vital strip with urgency tiers + decay arrows ─────────── */}
      {hasMonitor && (
        <div id="mini-monitor" className="flex items-stretch bg-slate-900 text-white shadow-md">
          {/* HR */}
          <div className="flex flex-col items-center flex-1 py-1.5 px-1 gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-slate-300 text-[10px] font-semibold leading-none">HR</span>
              {unlocked!.hr && (() => {
                const d = decayArrow(vitalDecayRates.hr);
                return d ? <span className={`text-[9px] font-bold leading-none ${d.cls}`}>{d.arrow}</span> : null;
              })()}
            </div>
            <span
              className={`font-mono text-base leading-none ${
                unlocked!.hr
                  ? vitalValueClass(hrUrgency(monitorState!.hr), 'text-green-400')
                  : 'text-slate-600'
              }`}
            >
              {unlocked!.hr ? monitorState!.hr : '--'}
            </span>
          </div>

          {/* BP */}
          <div className="flex flex-col items-center flex-1 py-1.5 px-1 gap-0.5 border-l border-slate-700">
            <div className="flex items-center gap-1">
              <span className="text-slate-300 text-[10px] font-semibold leading-none">BP</span>
              {unlocked!.bp && (() => {
                const d = decayArrow(vitalDecayRates.bp);
                return d ? <span className={`text-[9px] font-bold leading-none ${d.cls}`}>{d.arrow}</span> : null;
              })()}
            </div>
            <span
              className={`font-mono text-base leading-none ${
                unlocked!.bp
                  ? vitalValueClass(bpSysUrgency(monitorState!.bp), 'text-blue-400')
                  : 'text-slate-600'
              }`}
            >
              {unlocked!.bp ? monitorState!.bp : '--/--'}
            </span>
          </div>

          {/* SpO₂ */}
          <div className="flex flex-col items-center flex-1 py-1.5 px-1 gap-0.5 border-l border-slate-700">
            <div className="flex items-center gap-1">
              <span className="text-slate-300 text-[10px] font-semibold leading-none">SpO₂</span>
              {unlocked!.spo2 && (() => {
                const d = decayArrow(vitalDecayRates.spo2);
                return d ? <span className={`text-[9px] font-bold leading-none ${d.cls}`}>{d.arrow}</span> : null;
              })()}
            </div>
            <span
              className={`font-mono text-base leading-none ${
                unlocked!.spo2
                  ? vitalValueClass(spo2Urgency(monitorState!.spo2), 'text-cyan-400')
                  : 'text-slate-600'
              }`}
            >
              {unlocked!.spo2 ? `${monitorState!.spo2}%` : '--'}
            </span>
          </div>

          {/* RR */}
          <div className="flex flex-col items-center flex-1 py-1.5 px-1 gap-0.5 border-l border-slate-700">
            <div className="flex items-center gap-1">
              <span className="text-slate-300 text-[10px] font-semibold leading-none">RR</span>
              {unlocked!.rr && (() => {
                const d = decayArrow(vitalDecayRates.rr);
                return d ? <span className={`text-[9px] font-bold leading-none ${d.cls}`}>{d.arrow}</span> : null;
              })()}
            </div>
            <span
              className={`font-mono text-base leading-none ${
                unlocked!.rr
                  ? vitalValueClass(rrUrgency(monitorState!.rr), 'text-violet-400')
                  : 'text-slate-600'
              }`}
            >
              {unlocked!.rr ? monitorState!.rr : '--'}
            </span>
          </div>
        </div>
      )}

      {/* ── UrgencyStrip: merged failure proximity + intervention countdowns ── */}
      {/* Render always when monitor is active so walkthrough can target it */}
      {hasMonitor && (
        <div className="flex items-stretch bg-slate-800">
          <div className="relative min-w-0 flex-1">
            <div
              id="urgency-strip"
              className="flex items-center gap-1.5 overflow-x-auto bg-slate-800 px-3 scrollbar-none transition-all duration-200 py-1.5 min-h-[2rem]"
              aria-label="Timing alerts"
            >
              {urgencyItems.map((item) => (
                <span
                  key={item.key}
                  role="status"
                  tabIndex={0}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-tight ${URGENCY_PILL[item.urgency]}`}
                  aria-label={formatUrgencyItemAriaLabel(item)}
                  title={formatUrgencyItemTitle(item)}
                >
                  {item.label}
                  <span className="font-mono opacity-80">{Math.ceil(item.remainingSec)}s</span>
                </span>
              ))}
            </div>
            {urgencyItems.length > 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-800 to-transparent"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex shrink-0 items-center pr-2">
            <UrgencyStripHelpToggle suppressed={suppressUrgencyHelp} />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
