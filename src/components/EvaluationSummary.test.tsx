import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvaluationSummary, { type ActionFeedback } from './EvaluationSummary';

vi.mock('./ProcedureGuide', () => ({
  default: ({ isOpen, onClose, title }: { isOpen: boolean; onClose: () => void; title: string }) => isOpen ? (
    <div data-testid="procedure-guide">
      <span>{title}</span>
      <button type="button" onClick={onClose}>Close review guide</button>
    </div>
  ) : null,
}));

const baseProps = {
  score: 92,
  actions: [] as ActionFeedback[],
  clinicalConclusion: 'Prompt escalation and accurate sequencing improved perfusion.',
  outcome: 'success' as const,
  conclusion: 'Patient stabilized.',
  onRestart: vi.fn(),
  onReturnToLibrary: vi.fn(),
  onReviewProcedure: vi.fn(),
};

const reviewableAction: ActionFeedback = {
  id: 'action-1',
  name: 'Defibrillation Attempt',
  isCorrect: false,
  isDuplicate: false,
  comment: 'This intervention was attempted before the expected sequence step.',
  timestamp: 'T+00:20',
  reviewId: 'cpr',
};

describe('EvaluationSummary tier help', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens and closes the explicit tier help on demand', async () => {
    const user = userEvent.setup();

    render(<EvaluationSummary {...baseProps} />);

    const trigger = screen.getByRole('button', { name: /tier help/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/Lower tiers usually reflect missed or out-of-sequence interventions rather than speed alone/i)
    ).toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByText(/Lower tiers usually reflect missed or out-of-sequence interventions rather than speed alone/i)
    ).not.toBeInTheDocument();
  });

  it('supports keyboard open and escape-close while keeping focus on the trigger', async () => {
    const user = userEvent.setup();

    render(<EvaluationSummary {...baseProps} />);

    await user.tab();

    const trigger = screen.getByRole('button', { name: /tier help/i });

    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(
      screen.queryByText(/Lower tiers usually reflect missed or out-of-sequence interventions rather than speed alone/i)
    ).not.toBeInTheDocument();
  });

  it('closes when focus moves to another control without stealing that focus', async () => {
    const user = userEvent.setup();

    render(<EvaluationSummary {...baseProps} />);

    const trigger = screen.getByRole('button', { name: /tier help/i });

    await user.click(trigger);

    await user.tab();

    const restartButton = screen.getByRole('button', { name: /try scenario again/i });

    expect(restartButton).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('renders the tier help panel in a fixed portal outside the clipped score card container', async () => {
    const user = userEvent.setup();
    const { container } = render(<EvaluationSummary {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /tier help/i }));

    const panel = screen.getByRole('note');
    const scoreCard = container.querySelector('#score-gauge');

    expect(panel).toHaveClass('fixed');
    expect(document.body).toContainElement(panel);
    expect(scoreCard).not.toContainElement(panel);
  });

  it('suppresses the local tier help while debrief overlays are active', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EvaluationSummary
        {...baseProps}
        actions={[reviewableAction]}
      />
    );

    await user.click(screen.getByRole('button', { name: /tier help/i }));

    expect(
      screen.getByText(/Lower tiers usually reflect missed or out-of-sequence interventions rather than speed alone/i)
    ).toBeInTheDocument();

    rerender(
      <EvaluationSummary
        {...baseProps}
        actions={[reviewableAction]}
        inlineHelpBlockers={{ helpPanel: true }}
      />
    );

    expect(screen.queryByRole('button', { name: /tier help/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Lower tiers usually reflect missed or out-of-sequence interventions rather than speed alone/i)
    ).not.toBeInTheDocument();

    rerender(
      <EvaluationSummary
        {...baseProps}
        actions={[reviewableAction]}
        inlineHelpBlockers={{ walkthrough: true }}
      />
    );

    expect(screen.queryByRole('button', { name: /tier help/i })).not.toBeInTheDocument();

    rerender(
      <EvaluationSummary
        {...baseProps}
        actions={[reviewableAction]}
      />
    );

    await user.click(screen.getByRole('button', { name: /tier help/i }));
    await user.click(screen.getByRole('button', { name: /review protocol/i }));

    expect(screen.getByTestId('procedure-guide')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tier help/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Lower tiers usually reflect missed or out-of-sequence interventions rather than speed alone/i)
    ).not.toBeInTheDocument();

    rerender(
      <EvaluationSummary
        {...baseProps}
        actions={[reviewableAction]}
      />
    );

    await user.click(screen.getByRole('button', { name: /close review guide/i }));

    expect(screen.getByRole('button', { name: /tier help/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
