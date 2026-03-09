import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientView from './PatientView';
import type { PatientState, ActiveIntervention } from '../types/scenario';

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

const mockInterventions: ActiveIntervention[] = [
  { id: 'cpr', start_time: 0, duration_sec: 30 },
  { id: 'epinephrine', start_time: 5, duration_sec: undefined },
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

  it('renders active intervention badges for each active intervention', () => {
    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={mockInterventions} />);
    expect(screen.getByText('CPR')).toBeInTheDocument();
    expect(screen.getByText('EPINEPHRINE')).toBeInTheDocument();
  });

  it('does not render any intervention badges when there are no active interventions', () => {
    render(<PatientView onFinish={vi.fn()} vitals={stableVitals} activeInterventions={[]} />);
    expect(screen.queryByText('CPR')).not.toBeInTheDocument();
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
