import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Header from './Header';
import type { PatientState } from '../types/scenario';
import type { UrgencyItem } from '../lib/urgencyContent';

const monitorState: PatientState = {
  hr: 124,
  bp: '94/62',
  spo2: 91,
  rr: 28,
  pulsePresent: true,
  rhythm: 'Sinus',
};

const unlocked = {
  hr: true,
  spo2: true,
  bp: true,
  rr: true,
} as const;

const urgencyItems: UrgencyItem[] = [
  {
    key: 'fail-elapsed-1',
    type: 'failure',
    label: '⚠ Patient risk',
    remainingSec: 20,
    urgency: 'medium',
  },
  {
    key: 'iv-cpr',
    type: 'intervention',
    label: '↻ CPR active',
    remainingSec: 9,
    urgency: 'critical',
  },
];

const baseProps = {
  onHelpClick: () => {},
  walkthroughCompleted: true,
  monitorState,
  unlocked,
  urgencyItems,
  timerPct: 0.5,
  elapsedSec: 45,
};

describe('Header urgency strip help', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('opens explicitly, closes on outside click, and supports escape dismissal without moving focus', async () => {
    const user = userEvent.setup();

    const { container } = render(<Header {...baseProps} />);

    const trigger = screen.getByRole('button', { name: /urgency help/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveFocus();
    expect(
      screen.getByText(/The urgency strip separates patient-risk timers from intervention timers/i)
    ).toBeInTheDocument();
    const panel = screen.getByRole('note');
    const urgencyStrip = container.querySelector('#urgency-strip');

    expect(panel).toHaveClass('fixed');
    expect(document.body).toContainElement(panel);
    expect(urgencyStrip).not.toContainElement(panel);
    expect(within(urgencyStrip as HTMLElement).getByText('Patient risk')).toBeInTheDocument();
    expect(within(urgencyStrip as HTMLElement).getByText('Intervention timers')).toBeInTheDocument();

    await user.click(document.body);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('closes when focus moves to another tabbable header element without stealing focus', async () => {
    const user = userEvent.setup();

    render(<Header {...baseProps} />);

    const trigger = screen.getByRole('button', { name: /urgency help/i });

    await user.click(trigger);

    await user.tab({ shift: true });

    const contextualHelpButton = screen.getByRole('button', { name: /open contextual help panel/i });

    expect(contextualHelpButton).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('suppresses the strip help trigger and closes an open panel when higher-priority blockers appear', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Header {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /urgency help/i }));

    expect(screen.getByRole('note')).toBeInTheDocument();

    rerender(<Header {...baseProps} inlineHelpBlockers={{ helpPanel: true }} />);

    expect(screen.queryByRole('button', { name: /urgency help/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    rerender(<Header {...baseProps} inlineHelpBlockers={{ walkthrough: true }} />);

    expect(screen.queryByRole('button', { name: /urgency help/i })).not.toBeInTheDocument();

    rerender(<Header {...baseProps} />);

    expect(screen.getByRole('button', { name: /urgency help/i })).toBeInTheDocument();
  });

  it('keeps the help trigger outside the pill scroller and remains stable across empty and overflow strip states', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <Header
        {...baseProps}
        urgencyItems={[]}
      />,
    );

    const emptyStrip = container.querySelector('#urgency-strip');
    const patientRiskLane = container.querySelector('#patient-risk-timers');
    const interventionLane = container.querySelector('#intervention-timers');
    const trigger = screen.getByRole('button', { name: /urgency help/i });

    expect(emptyStrip).not.toBeNull();
    expect(patientRiskLane).not.toBeNull();
    expect(interventionLane).not.toBeNull();
    expect(trigger).toBeInTheDocument();
    expect(emptyStrip).not.toContainElement(trigger);
    expect(screen.getByText('Live timers')).toBeInTheDocument();
    expect(screen.getByText('Quiet now')).toBeInTheDocument();
    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(emptyStrip).toHaveAttribute('data-strip-state', 'empty');
    expect(within(patientRiskLane as HTMLElement).getByText('All clear')).toBeInTheDocument();
    expect(within(interventionLane as HTMLElement).getByText('None active')).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByText(/If the strip is empty, there are no patient-risk or active intervention timers right now/i)).toBeInTheDocument();

    const overflowItems = Array.from({ length: 8 }, (_, index) => ({
      key: `item-${index}`,
      type: index % 2 === 0 ? 'failure' : 'intervention',
      label: `Item ${index + 1}`,
      remainingSec: 40 - index,
      urgency: index === 0 ? 'critical' : index < 4 ? 'medium' : 'low',
    })) satisfies UrgencyItem[];

    rerender(<Header {...baseProps} urgencyItems={overflowItems} />);

    const overflowStrip = container.querySelector('#urgency-strip');
    const overflowPatientRiskLane = container.querySelector('#patient-risk-timers');
    const overflowInterventionLane = container.querySelector('#intervention-timers');

    expect(overflowStrip).not.toBeNull();
    expect(overflowStrip).toHaveAttribute('data-strip-state', 'active');
    expect(overflowStrip).not.toContainElement(screen.getByRole('button', { name: /urgency help/i }));
    expect(within(overflowStrip as HTMLElement).getAllByRole('status')).toHaveLength(overflowItems.length);
    expect(within(overflowPatientRiskLane as HTMLElement).getAllByRole('status')).toHaveLength(4);
    expect(within(overflowInterventionLane as HTMLElement).getAllByRole('status')).toHaveLength(4);
    expect(screen.queryByText('Quiet now')).not.toBeInTheDocument();
  });
});
