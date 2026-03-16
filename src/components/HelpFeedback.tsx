import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface HelpFeedbackProps {
  tipId: string;
  onSubmitFeedback: (topicId: string, rating: 'up' | 'down', comment?: string) => void;
}

type FeedbackState = 'idle' | 'rated' | 'submitted';

const HelpFeedback: React.FC<HelpFeedbackProps> = ({ tipId, onSubmitFeedback }) => {
  const [state, setState] = useState<FeedbackState>('idle');
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');
  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitRef.current !== null) {
        clearTimeout(autoSubmitRef.current);
      }
    };
  }, []);

  // Set up or reset the 4-second auto-submit timer whenever we enter "rated" state
  // or the comment changes (typing resets the timer)
  useEffect(() => {
    if (state !== 'rated' || rating === null) return;

    if (autoSubmitRef.current !== null) {
      clearTimeout(autoSubmitRef.current);
    }

    autoSubmitRef.current = setTimeout(() => {
      onSubmitFeedback(tipId, rating, undefined);
      setState('submitted');
    }, 4000);

    return () => {
      if (autoSubmitRef.current !== null) {
        clearTimeout(autoSubmitRef.current);
      }
    };
    // comment is intentionally NOT in the dep array here; handleCommentChange resets manually
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, rating, tipId, onSubmitFeedback]);

  const handleRate = (chosen: 'up' | 'down') => {
    setRating(chosen);
    setComment('');
    setState('rated');
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);

    // Reset the auto-submit timer on each keystroke
    if (autoSubmitRef.current !== null) {
      clearTimeout(autoSubmitRef.current);
    }
    if (rating !== null) {
      autoSubmitRef.current = setTimeout(() => {
        onSubmitFeedback(tipId, rating, undefined);
        setState('submitted');
      }, 4000);
    }
  };

  const handleSubmit = () => {
    if (autoSubmitRef.current !== null) {
      clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }
    if (rating !== null) {
      onSubmitFeedback(tipId, rating, comment.trim() || undefined);
    }
    setState('submitted');
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
      </div>

      {/* Rated state: textarea + submit */}
      {state === 'rated' && (
        <div className="mt-2 transition-all duration-200">
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Tell us more (optional)"
            maxLength={280}
            rows={3}
            className="w-full text-xs text-slate-600 placeholder-slate-400 border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-medical-400"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-1 bg-medical-500 text-white text-xs px-3 py-1 rounded-lg hover:bg-medical-600 transition-colors"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default HelpFeedback;
