import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface HelpFeedbackProps {
  tipId: string;
  onSubmitFeedback: (topicId: string, rating: 'up' | 'down', comment?: string) => void;
}

type FeedbackState = 'idle' | 'rated' | 'submitted';

const AUTO_SUBMIT_MS = 4000;

const HelpFeedback: React.FC<HelpFeedbackProps> = ({ tipId, onSubmitFeedback }) => {
  const [state, setState] = useState<FeedbackState>('idle');
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');
  const [timerProgress, setTimerProgress] = useState(100);

  const timerStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (autoSubmitRef.current !== null) {
      clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }
    timerStartRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    clearTimers();
    setTimerProgress(100);
    timerStartRef.current = performance.now();

    // rAF-driven progress bar — transition-none on the bar div is intentional:
    // CSS transition-width lags behind rAF updates and causes jitter at 60fps.
    const tick = (now: number) => {
      if (timerStartRef.current === null) return;
      const elapsed = now - timerStartRef.current;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_SUBMIT_MS) * 100);
      setTimerProgress(remaining);
      if (elapsed < AUTO_SUBMIT_MS) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    autoSubmitRef.current = setTimeout(() => {
      if (rating !== null) {
        onSubmitFeedback(tipId, rating, undefined);
      }
      setState('submitted');
    }, AUTO_SUBMIT_MS);
  }, [clearTimers, rating, tipId, onSubmitFeedback]);

  // Start timer when entering rated state
  useEffect(() => {
    if (state === 'rated' && rating !== null) {
      startTimer();
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, rating]);

  // Clean up on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleRate = (chosen: 'up' | 'down') => {
    setRating(chosen);
    setComment('');
    setState('rated');
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    if (state === 'rated') startTimer();
  };

  const handleSubmit = () => {
    clearTimers();
    if (rating !== null) {
      onSubmitFeedback(tipId, rating, comment.trim() || undefined);
    }
    setState('submitted');
  };

  const handleCancel = () => {
    clearTimers();
    setTimerProgress(100);
    // Stay in rated state with timer paused — user can still manually submit
  };

  if (state === 'submitted') {
    return (
      <p className="text-[10px] text-slate-400 mt-2">
        Thanks for your feedback! ✓
      </p>
    );
  }

  return (
    <div className="mt-2">
      {/* Row: label + thumb buttons */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400">Was this helpful?</span>

        <button
          type="button"
          onClick={() => handleRate('up')}
          aria-label="Thumbs up"
          className={
            state === 'rated' && rating === 'up'
              ? 'text-emerald-500'
              : 'text-slate-400 hover:text-slate-600'
          }
        >
          <ThumbsUp size={14} />
        </button>

        <button
          type="button"
          onClick={() => handleRate('down')}
          aria-label="Thumbs down"
          className={
            state === 'rated' && rating === 'down'
              ? 'text-red-400'
              : 'text-slate-400 hover:text-slate-600'
          }
        >
          <ThumbsDown size={14} />
        </button>

        {/* Cancel button — only shown in rated state */}
        {state === 'rated' && (
          <button
            type="button"
            onClick={handleCancel}
            className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Shrinking progress bar — rAF driven, transition-none intentional */}
      {state === 'rated' && (
        <div className="mt-1.5 h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-none"
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      )}

      {/* Rated state: textarea + submit */}
      {state === 'rated' && (
        <div className="mt-2 transition-all duration-200">
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Tell us more (optional) — submitting automatically…"
            maxLength={280}
            rows={3}
            className="w-full text-xs text-slate-600 placeholder-slate-400 border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-medical-400"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-1 bg-medical-500 text-white text-xs px-3 py-1 rounded-lg hover:bg-medical-600 transition-colors"
          >
            Submit now
          </button>
        </div>
      )}
    </div>
  );
};

export default HelpFeedback;
