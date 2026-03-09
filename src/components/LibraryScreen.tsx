import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Scenario } from '../types/scenario';
import { Play, Activity, Clock, ShieldAlert, HeartPulse, Stethoscope, BriefcaseMedical, X, BookOpen, Zap, Gauge, HeartOff, Flame, User, Heart, Wind, Droplets } from 'lucide-react';

const WELCOME_DISMISSED_KEY = 'simnurse_welcome_dismissed';

interface LibraryScreenProps {
  onSelectScenario: (scenario: Scenario) => void;
}

const getScenarioIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('arrest') || lower.includes('vfib') || lower.includes('asystole')) return HeartPulse;
    if (lower.includes('stroke') || lower.includes('cva')) return Activity;
    if (lower.includes('overdose') || lower.includes('anaphylactic')) return ShieldAlert;
    if (lower.includes('pediatric')) return BriefcaseMedical;
    if (lower.includes('bradycardia')) return Gauge;
    if (lower.includes('svt') || lower.includes('vtach') || lower.includes('tachycardia')) return Zap;
    if (lower.includes('pea')) return HeartOff;
    if (lower.includes('acs') || lower.includes('stemi')) return Flame;
    return Stethoscope;
};

// ─── Scenario Preview Modal ───────────────────────────────────────────────────

interface ScenarioPreviewModalProps {
  scenario: Scenario;
  onConfirm: () => void;
  onCancel: () => void;
}

const ScenarioPreviewModal: React.FC<ScenarioPreviewModalProps> = ({ scenario, onConfirm, onCancel }) => {
  const Icon = getScenarioIcon(scenario.title);
  const { initial_state: vs, patient, meta } = scenario;

  const vitalItems = [
    { label: 'HR', value: vs.hr === 0 ? '—' : `${vs.hr} bpm`, Icon: Heart },
    { label: 'SpO₂', value: vs.spo2 === 0 ? '—' : `${vs.spo2}%`, Icon: Droplets },
    { label: 'BP', value: vs.bp === '0/0' ? '—' : vs.bp, Icon: Activity },
    { label: 'RR', value: vs.rr === 0 ? '—' : `${vs.rr} /min`, Icon: Wind },
  ];

  return (
    /* backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${scenario.title}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-[440px] rounded-t-3xl bg-white shadow-2xl overflow-hidden">
        {/* header band */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-6 pb-5 text-white">
          <button
            type="button"
            aria-label="Close preview"
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-4 mb-3">
            <div className="shrink-0 p-3 bg-white/10 rounded-xl">
              <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">Case Preview</p>
              <h2 className="text-base font-black leading-tight">{scenario.title}</h2>
            </div>
          </div>

          {/* patient identity */}
          {patient && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <User size={14} className="shrink-0" />
              <span className="font-medium">{patient.name}</span>
              <span className="text-white/50">·</span>
              <span>{patient.age}</span>
              <span className="text-white/50">·</span>
              <span>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender}</span>
            </div>
          )}
        </div>

        {/* body */}
        <div className="px-6 pt-5 pb-6">
          {/* meta badges */}
          {meta && (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                meta.difficulty === 'Advanced'
                  ? 'bg-red-50 text-red-600'
                  : meta.difficulty === 'Intermediate'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}>
                {meta.difficulty}
              </span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                {meta.domain}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <Clock size={12} />
                <span>~{Math.round(meta.estimatedDurationSec / 60)} min</span>
              </div>
            </div>
          )}

          {/* presenting rhythm */}
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Presenting Rhythm</p>
            <p className="text-sm font-bold text-slate-800">
              {vs.rhythm}{vs.pulsePresent ? '' : ' — Pulseless'}
            </p>
          </div>

          {/* initial vitals grid */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Initial Vitals</p>
            <div className="grid grid-cols-2 gap-2">
              {vitalItems.map(({ label, value, Icon: VIcon }) => (
                <div key={label} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                  <VIcon size={16} className="shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-black text-slate-700 leading-tight">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id="begin-scenario-btn"
              type="button"
              onClick={onConfirm}
              className="flex-[2] py-3.5 rounded-2xl bg-medical-500 text-white text-sm font-black flex items-center justify-center gap-2 hover:bg-medical-600 active:scale-[0.98] transition-all shadow-sm"
            >
              <Play size={16} fill="currentColor" />
              Begin Scenario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Library Screen ───────────────────────────────────────────────────────────

const LibraryScreen: React.FC<LibraryScreenProps> = ({ onSelectScenario }) => {
  const [showWelcome, setShowWelcome] = useState<boolean>(
    () => localStorage.getItem(WELCOME_DISMISSED_KEY) !== 'true'
  );
  const [previewScenario, setPreviewScenario] = useState<Scenario | null>(null);

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    setShowWelcome(false);
  };

  const handleCardClick = (scenario: Scenario) => {
    setPreviewScenario(scenario);
  };

  const handleConfirmStart = () => {
    if (previewScenario) {
      onSelectScenario(previewScenario);
      setPreviewScenario(null);
    }
  };

  const handleCancelPreview = () => {
    setPreviewScenario(null);
  };

  // Fetch scenarios from Dexie
  const scenarios = useLiveQuery(() => db.scenarios.toArray());

  return (
    <main id="library-screen-container" className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <header id="library-screen-header" className="sticky top-0 z-20 border-b border-slate-100 bg-white p-6 pb-4 shadow-sm">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Simulations</h1>
        <p className="text-sm font-medium text-slate-500">
          Select a clinical case to begin.
        </p>
      </header>

      <section id="scenarios-list-container" className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        {showWelcome && (
          <div
            id="welcome-banner"
            className="relative mb-6 rounded-2xl bg-gradient-to-br from-medical-500 to-indigo-600 p-5 text-white shadow-premium"
          >
            <button
              type="button"
              aria-label="Dismiss welcome banner"
              onClick={dismissWelcome}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <div className="shrink-0 p-3 bg-white/20 rounded-xl">
                <BookOpen size={24} strokeWidth={2.5} />
              </div>
              <div className="pr-6">
                <h2 className="text-base font-black tracking-tight mb-1">Welcome to SimNurse</h2>
                <p className="text-sm text-white/90 leading-relaxed mb-3">
                  Practice ACLS and BLS clinical decision-making in realistic emergency scenarios.
                  Each case runs a live physiological model — your actions directly affect the patient.
                </p>
                <ul className="space-y-1 text-xs text-white/80">
                  <li className="flex items-center gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-black">1</span>
                    Choose a scenario from the list below.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-black">2</span>
                    Assess the patient, then apply actions in the correct order.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-black">3</span>
                    Review your performance in the debrief.
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={dismissWelcome}
                  className="mt-4 px-4 py-1.5 bg-white text-medical-600 rounded-full text-xs font-bold hover:bg-white/90 transition-colors"
                >
                  Got it, let's start
                </button>
              </div>
            </div>
          </div>
        )}
        {scenarios === undefined ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-500"></div>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
               <BriefcaseMedical size={32} className="text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1">Library Empty</h3>
            <p className="text-sm text-slate-500 max-w-[250px]">
              No scenarios found in the local database. The seed file may be missing or failed to load.
            </p>
          </div>
        ) : (
          <menu className="space-y-4 p-0 m-0">
            {scenarios.map((scenario) => {
               const Icon = getScenarioIcon(scenario.title);

               return (
                <li key={scenario.scenario_id} className="list-none">
                <button
                  id={`scenario-btn-${scenario.scenario_id}`}
                  type="button"
                  onClick={() => handleCardClick(scenario)}
                  className="w-full text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-premium hover:border-medical-200 transition-all group flex items-start gap-4 active:scale-[0.98]"
                >
                  <div className="p-3 bg-medical-50 text-medical-500 rounded-xl group-hover:bg-medical-500 group-hover:text-white transition-colors shrink-0">
                    <Icon size={24} strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-800 leading-tight mb-1">
                        {scenario.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {scenario.meta ? (
                          <>
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              scenario.meta.difficulty === 'Advanced'
                                ? 'bg-red-50 text-red-600'
                                : scenario.meta.difficulty === 'Intermediate'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {scenario.meta.difficulty}
                            </span>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                              {scenario.meta.domain}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              <Clock size={12} />
                              <span>~{Math.round(scenario.meta.estimatedDurationSec / 60)} min</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <Clock size={12} />
                            <span>Dynamic</span>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="shrink-0 p-2 text-slate-300 group-hover:text-medical-500 transition-colors">
                      <Play fill="currentColor" size={20} />
                  </div>
                </button>
                </li>
               )
            })}
          </menu>
        )}
      </section>

      {/* Scenario preview / confirmation modal (ISSUE-06) */}
      {previewScenario && (
        <ScenarioPreviewModal
          scenario={previewScenario}
          onConfirm={handleConfirmStart}
          onCancel={handleCancelPreview}
        />
      )}
    </main>
  );
};

export default LibraryScreen;
