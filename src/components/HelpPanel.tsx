import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, BookOpen, Lightbulb, ChevronDown, ChevronUp, Keyboard, RotateCcw } from 'lucide-react';
import type { HelpSystemState, HelpSystemActions } from '../hooks/useHelpSystem';
import type { AppContext } from '../data/helpContent';
import HelpFeedback from './HelpFeedback';

interface HelpPanelProps {
  helpSystem: HelpSystemState & HelpSystemActions;
}

const CONTEXT_LABELS: Record<AppContext, string> = {
  library: 'Case Library Help',
  preview_modal: 'Case Preview Help',
  patient: 'Patient View Help',
  actions: 'Actions Screen Help',
  status: 'Status Dashboard Help',
  debrief: 'Debrief Help',
};

const KEYBOARD_SHORTCUTS: { key: string; description: string }[] = [
  { key: '→', description: 'Next step' },
  { key: '←', description: 'Previous step' },
  { key: 'Esc', description: 'Dismiss tour' },
  { key: '? / H', description: 'Open / close help panel' },
];


const GlobalTipsAccordion: React.FC<{
  tips: import('../data/helpContent').HelpTip[];
  expandedTipId: string | null;
  onToggle: (id: string) => void;
  submitFeedback: (topicId: string, rating: 'up' | 'down', comment?: string) => void;
  defaultCollapsed: boolean;
}> = ({ tips, expandedTipId, onToggle, submitFeedback, defaultCollapsed }) => {
  const [groupOpen, setGroupOpen] = useState(!defaultCollapsed);

  return (
    <div>
      <button
        type="button"
        onClick={() => setGroupOpen(g => !g)}
        className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-600 transition-colors"
      >
        {groupOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        General Tips
      </button>
      {groupOpen && (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          {tips.map((tip, index) => {
            const isExpanded = expandedTipId === tip.id;
            const isLast = index === tips.length - 1;
            return (
              <div key={tip.id} className={isLast ? '' : 'border-b border-slate-100'}>
                <button
                  type="button"
                  onClick={() => onToggle(tip.id)}
                  className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-700 leading-snug pr-2">{tip.heading}</span>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 shrink-0" />
                  )}
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-4 pb-4">
                    <p className="text-xs text-slate-500 leading-relaxed mb-2 whitespace-pre-line">{tip.body}</p>
                    <HelpFeedback tipId={tip.id} onSubmitFeedback={submitFeedback} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const HelpPanel: React.FC<HelpPanelProps> = ({ helpSystem }) => {
  const [expandedTipId, setExpandedTipId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [resetPending, setResetPending] = useState(false);

  // Detect non-touch (desktop) device once on mount
  useEffect(() => {
    const isNonTouch = !window.matchMedia('(pointer: coarse)').matches;
    setIsDesktop(isNonTouch);
  }, []);

  // Reset accordion when panel opens or context changes
  useEffect(() => {
    if (helpSystem.panelOpen) {
      setExpandedTipId(null);
      setFilterText('');
    }
  }, [helpSystem.panelOpen, helpSystem.context]);

  if (!helpSystem.panelOpen) return null;

  const { content, wasWalkthroughCompleted, startWalkthrough, resumeWalkthrough, closePanel, submitFeedback } = helpSystem;

  const totalTipCount = content.contextTips.length + content.quickTips.length;
  const normalised = filterText.toLowerCase();

  const filteredContextTips = normalised
    ? content.contextTips.filter(
        t => t.heading.toLowerCase().includes(normalised) || t.body.toLowerCase().includes(normalised)
      )
    : content.contextTips;

  const filteredGlobalTips = normalised
    ? content.quickTips.filter(
        t => t.heading.toLowerCase().includes(normalised) || t.body.toLowerCase().includes(normalised)
      )
    : content.quickTips;

  const hasFilterResults = filteredContextTips.length + filteredGlobalTips.length > 0;
  const walkthroughId = helpSystem.content.walkthroughId;
  const isCompleted = wasWalkthroughCompleted(walkthroughId);

  // Mid-tour = walkthroughId is set AND step > 0 AND not completed
  // (openPanel() always calls _pauseWalkthrough first, so walkthroughActive is always false here)
  const isMidTour =
    helpSystem.walkthroughId !== null &&
    helpSystem.walkthroughId === walkthroughId &&
    helpSystem.walkthroughStepIndex > 0 &&
    !isCompleted;

  let walkthroughBtnLabel: string;
  if (isMidTour) {
    walkthroughBtnLabel = '▶ Resume Walkthrough';
  } else if (isCompleted) {
    walkthroughBtnLabel = 'Replay Walkthrough';
  } else {
    walkthroughBtnLabel = 'Start Walkthrough';
  }

  const handleTipToggle = (tipId: string) => {
    setExpandedTipId((prev) => (prev === tipId ? null : tipId));
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={closePanel}
      />

      {/* Sheet — constrain to app shell width, mb-16 clears BottomNav */}
      <div className="relative w-full sm:max-w-md mb-16">
        <div
          className="w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-100"
          style={{ maxHeight: '88vh', overflowY: 'auto' }}
        >
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />

          <div className="p-5 pb-6">
            {/* ── Section 1: Header ── */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-medical-500 rounded-xl text-white shadow-lg shadow-medical-100">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                    {CONTEXT_LABELS[helpSystem.context]}
                  </h2>
                  <span className="text-[10px] font-bold text-medical-600 uppercase tracking-widest mt-1 inline-block">
                    Contextual Guide
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                title="Close"
                className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Section 2: Walkthrough CTA ── */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={14} className="text-medical-500 shrink-0" />
                <h3 className="text-sm font-bold text-slate-700">Guided Walkthrough</h3>
                {isCompleted && !isMidTour && (
                  <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                    ✓ Completed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">{content.walkthroughTitle}</p>
              <button
                type="button"
                onClick={() => isMidTour ? resumeWalkthrough() : startWalkthrough()}
                className={`text-white rounded-xl text-sm font-bold px-4 py-2.5 w-full transition-colors active:scale-95 ${
                  isMidTour
                    ? 'bg-indigo-500 hover:bg-indigo-600'
                    : 'bg-medical-500 hover:bg-medical-600'
                }`}
              >
                {isMidTour
                  ? `Resume — step ${helpSystem.walkthroughStepIndex + 1} of ${content.steps.length}`
                  : walkthroughBtnLabel}
              </button>
            </div>

            {/* ── Section 3: Context tips + General Tips + optional filter ── */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={14} className="text-slate-500 shrink-0" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {content.contextTips.length > 0 ? 'This Screen' : 'Quick Tips'}
                </h3>
              </div>

              {/* Filter input — shown when total tips >= 8 */}
              {totalTipCount >= 8 && (
                <div className="mb-3">
                  <input
                    type="search"
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    placeholder="Filter tips…"
                    className="w-full text-xs text-slate-600 placeholder-slate-400 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-medical-400 bg-slate-50"
                  />
                </div>
              )}

              {/* Context-specific tips (primary) */}
              {filteredContextTips.length > 0 && (
                <div className="rounded-2xl border border-slate-100 overflow-hidden mb-3">
                  {filteredContextTips.map((tip, index) => {
                    const isExpanded = expandedTipId === tip.id;
                    const isLast = index === filteredContextTips.length - 1;
                    return (
                      <div key={tip.id} className={isLast ? '' : 'border-b border-slate-100'}>
                        <button
                          type="button"
                          onClick={() => handleTipToggle(tip.id)}
                          className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-sm font-semibold text-slate-700 leading-snug pr-2">
                            {tip.heading}
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown size={16} className="text-slate-400 shrink-0" />
                          )}
                        </button>
                        <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                          <div className="px-4 pb-4">
                            <p className="text-xs text-slate-500 leading-relaxed mb-2 whitespace-pre-line">{tip.body}</p>
                            <HelpFeedback tipId={tip.id} onSubmitFeedback={submitFeedback} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Global tips (secondary — collapsible group) */}
              <GlobalTipsAccordion
                tips={filteredGlobalTips}
                expandedTipId={expandedTipId}
                onToggle={handleTipToggle}
                submitFeedback={submitFeedback}
                defaultCollapsed={content.contextTips.length > 0}
              />

              {/* Empty state when filter matches nothing */}
              {!hasFilterResults && filterText && (
                <p className="text-xs text-slate-400 text-center py-4">No tips match &ldquo;{filterText}&rdquo;</p>
              )}
            </div>

            {/* ── Section 4: Keyboard shortcuts (desktop only) ── */}
            {isDesktop && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Keyboard size={14} className="text-slate-500 shrink-0" />
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Keyboard Shortcuts
                  </h3>
                </div>

                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                        <tr
                          key={shortcut.key}
                          className={index < KEYBOARD_SHORTCUTS.length - 1 ? 'border-b border-slate-100' : ''}
                        >
                          <td className="px-4 py-2.5 w-20">
                            <kbd className="font-mono font-bold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 text-[11px]">
                              {shortcut.key}
                            </kbd>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{shortcut.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Section 5: Danger Zone ── */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw size={14} className="text-red-400 shrink-0" />
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Reset
                </h3>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  Clears all tour progress, feedback, session history, and suppressed guides. The app will reload with a fresh state.
                </p>
                {resetPending ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResetPending(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResetPending(false); void helpSystem.resetAll(); }}
                      className="flex-[2] flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold px-4 py-2.5 transition-colors active:scale-95"
                    >
                      <RotateCcw size={15} />
                      Yes, Reset
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResetPending(true)}
                    className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl text-sm font-bold px-4 py-2.5 transition-colors"
                  >
                    <RotateCcw size={15} />
                    Reset Everything
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HelpPanel;
