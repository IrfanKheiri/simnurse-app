import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientView from './PatientView';
import type { PatientState, ActiveIntervention } from '../types/scenario';
import { getInterventionBadgeLabel, getInterventionDisplayLabel } from '../lib/interventionLabels';

const stableVitals: PatientState = {
  hr: 75,
  bp: '120/80',
  spo2: 98,
  rr: 16,
  pulsePresent: true,
  temp: 37.0,
  etco2: 38,
  rhythm: 'Sinus',
  glucose: 100,
};

const hypoxicVitals: PatientState = {
  ...stableVitals,
  spo2: 85, // below 90 threshold — triggers Severe Hypoxia warning
};

const peaVitals: PatientState = {
  ...stableVitals,
  rhythm: 'PEA',
  pulsePresent: false,
  hr: 0,
  bp: '0/0',
  spo2: 78,
  rr: 0,
};

const manyInterventions: ActiveIntervention[] = [
  { id: 'cpr', start_time: 0, duration_sec: 30 },
  { id: 'oxygen_nrb', start_time: 5, duration_sec: 60 },
  { id: 'defibrillate', start_time: 10, duration_sec: undefined },
];

const overflowInterventions: ActiveIntervention[] = [
  ...manyInterventions,
  { id: 'aed_attach', start_time: 12, duration_sec: undefined },
];

describe('PatientView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Patient View heading', () => {
    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={[]} />);
    expect(screen.getByRole('heading', { name: 'Patient View' })).toBeInTheDocument();
  });

  it('shows "Stable" status when SpO2 is >= 90', () => {
    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={[]} />);
    expect(screen.getByText(/Status/)).toBeInTheDocument();
    expect(screen.getByText('Stable', { exact: false })).toBeInTheDocument();
  });

  it('shows "Severe Hypoxia" alert when SpO2 drops below 90', () => {
    render(<PatientView onFinish={vi.fn()} vitals={hypoxicVitals} activeInterventions={[]} />);
    expect(screen.getByText(/Severe Hypoxia/i)).toBeInTheDocument();
  });

  it('treats pulseless PEA as cardiac arrest', () => {
    render(<PatientView onFinish={vi.fn()} vitals={peaVitals} activeInterventions={[]} />);
    expect(screen.getByText(/CARDIAC ARREST/i)).toBeInTheDocument();
  });

  it('renders a stable empty intervention section when there are no active interventions', () => {
    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={[]} />);

    const interventionSection = screen.getByRole('region', { name: 'Active interventions' });
    expect(within(interventionSection).getByText('Interventions')).toBeInTheDocument();
    expect(within(interventionSection).getByText('No active interventions')).toBeInTheDocument();
    expect(within(interventionSection).getByText('No active interventions right now.')).toBeInTheDocument();
    expect(within(interventionSection).queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders a single intervention badge using the shared badge label helper', () => {
    const singleIntervention: ActiveIntervention[] = [
      { id: 'oxygen_nrb', start_time: 0, duration_sec: 60 },
    ];

    render(
      <PatientView
        onFinish={vi.fn()}
        vitals={stableVitals}
        activeInterventions={singleIntervention}
      />,
    );

    const interventionSection = screen.getByRole('region', { name: 'Active interventions' });
    expect(within(interventionSection).getByText('1 active intervention')).toBeInTheDocument();
    expect(within(interventionSection).getByText(getInterventionBadgeLabel('oxygen_nrb'))).toBeInTheDocument();
    expect(within(interventionSection).queryByText(/\+\d+ more/i)).not.toBeInTheDocument();
  });

  it('renders all intervention badges when the count stays within the visible limit', () => {
    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={manyInterventions} />);

    const interventionSection = screen.getByRole('region', { name: 'Active interventions' });
    const interventionList = within(interventionSection).getByRole('list', { name: 'Visible active interventions' });

    manyInterventions.forEach(({ id }) => {
      expect(within(interventionList).getByText(getInterventionBadgeLabel(id))).toBeInTheDocument();
    });

    expect(within(interventionSection).getByText('3 active interventions')).toBeInTheDocument();
    expect(within(interventionSection).queryByText(/\+\d+ more/i)).not.toBeInTheDocument();
    expect(within(interventionSection).queryByText(/Showing 3 of/i)).not.toBeInTheDocument();
  });

  it('renders a predictable overflow pill and hides badges beyond the visible limit', () => {
    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={overflowInterventions} />);

    const interventionSection = screen.getByRole('region', { name: 'Active interventions' });
    const interventionList = within(interventionSection).getByRole('list', { name: 'Visible active interventions' });

    overflowInterventions.slice(0, 3).forEach(({ id }) => {
      expect(within(interventionList).getByText(getInterventionBadgeLabel(id))).toBeInTheDocument();
    });

    expect(within(interventionList).getByText('+1 more')).toBeInTheDocument();
    expect(within(interventionSection).getByText('Showing 3 of 4 active interventions.')).toBeInTheDocument();
    expect(within(interventionList).queryByText(getInterventionBadgeLabel('aed_attach'))).not.toBeInTheDocument();
  });

  it('opens intervention help explicitly, closes on outside click, and supports escape dismissal while keeping focus safe', async () => {
    const user = userEvent.setup();

    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={manyInterventions} />);

    const interventionSection = screen.getByRole('region', { name: 'Active interventions' });
    const trigger = within(interventionSection).getByRole('button', { name: /intervention help/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    const panel = screen.getByRole('note');
    const helpList = within(panel).getByRole('list', { name: 'Current intervention help details' });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveFocus();
    expect(within(panel).getByText(/This section tracks the interventions currently affecting the patient/i)).toBeInTheDocument();
    expect(helpList).toHaveTextContent(getInterventionDisplayLabel('cpr'));
    expect(panel).toHaveClass('fixed');
    expect(document.body).toContainElement(panel);
    expect(interventionSection).not.toContainElement(panel);

    await user.click(document.body);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('closes intervention help when focus moves elsewhere without taking focus back', async () => {
    const user = userEvent.setup();

    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={manyInterventions} />);

    const trigger = screen.getByRole('button', { name: /intervention help/i });

    await user.click(trigger);

    await user.tab({ shift: true });

    const endButton = screen.getByRole('button', { name: /end scenario and view debrief/i });

    expect(endButton).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('suppresses intervention help for shared blockers and force-closes it when the end confirmation dialog opens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={manyInterventions} />,
    );

    await user.click(screen.getByRole('button', { name: /intervention help/i }));

    expect(screen.getByRole('note')).toBeInTheDocument();

    rerender(
      <PatientView
        onFinish={vi.fn()}
        vitals={stableVitals}
        activeInterventions={manyInterventions}
        inlineHelpBlockers={{ helpPanel: true }}
      />,
    );

    expect(screen.queryByRole('button', { name: /intervention help/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    rerender(
      <PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={manyInterventions} />,
    );

    const trigger = screen.getByRole('button', { name: /intervention help/i });

    await user.click(trigger);
    expect(screen.getByRole('note')).toBeInTheDocument();

    await user.click(screen.getByTitle('Finish Scenario'));

    expect(screen.getByText('End Scenario?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /intervention help/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('keeps the help trigger accessible and stable in empty and overflow intervention states', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={[]} />,
    );

    const emptySection = screen.getByRole('region', { name: 'Active interventions' });
    const emptyTrigger = within(emptySection).getByRole('button', { name: /intervention help/i });

    expect(emptySection).toContainElement(emptyTrigger);

    await user.click(emptyTrigger);

    const emptyPanel = screen.getByRole('note');

    expect(within(emptyPanel).getByText(/No active interventions are being tracked right now/i)).toBeInTheDocument();

    await user.keyboard('{Escape}');

    rerender(
      <PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={overflowInterventions} />,
    );

    const overflowSection = screen.getByRole('region', { name: 'Active interventions' });
    const overflowTrigger = within(overflowSection).getByRole('button', { name: /intervention help/i });

    expect(overflowSection).toContainElement(overflowTrigger);

    await user.click(overflowTrigger);

    const overflowPanel = screen.getByRole('note');
    const overflowHelpList = within(overflowPanel).getByRole('list', { name: 'Current intervention help details' });

    expect(overflowHelpList).toHaveTextContent(getInterventionDisplayLabel('aed_attach'));
    expect(within(overflowSection).getByText('+1 more')).toBeInTheDocument();
  });

  /**
   * FIX (L19): The End button now shows a confirmation dialog before calling onFinish.
   * Clicking "End" opens the dialog; clicking "End & Debrief" confirms and fires onFinish.
   */
  it('opens confirmation dialog when End is clicked, then calls onFinish on confirm', async () => {
    const mockFinish = vi.fn();
    render(<PatientView onFinish={mockFinish} vitals={stableVitals} activeInterventions={[]} />);

    // Click the End button to open the dialog
    await userEvent.click(screen.getByTitle('Finish Scenario'));

    // Dialog should now be visible
    expect(screen.getByText('End Scenario?')).toBeInTheDocument();
    // onFinish should NOT be called yet
    expect(mockFinish).not.toHaveBeenCalled();

    // Confirm by clicking the destructive action button
    await userEvent.click(screen.getByRole('button', { name: /End & Debrief/i }));
    expect(mockFinish).toHaveBeenCalledTimes(1);
  });

  it('dismisses confirmation dialog when Continue is clicked without calling onFinish', async () => {
    const mockFinish = vi.fn();
    render(<PatientView onFinish={mockFinish} vitals={stableVitals} activeInterventions={[]} />);

    await userEvent.click(screen.getByTitle('Finish Scenario'));
    expect(screen.getByText('End Scenario?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(mockFinish).not.toHaveBeenCalled();
    expect(screen.queryByText('End Scenario?')).not.toBeInTheDocument();
  });

  it('renders even when vitals are null without crashing', () => {
    render(<PatientView onFinish={vi.fn()} vitals={null} activeInterventions={[]} />);
    expect(screen.getByText('Stable', { exact: false })).toBeInTheDocument();
  });
});
