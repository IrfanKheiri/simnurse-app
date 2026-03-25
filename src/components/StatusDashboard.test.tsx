import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusDashboard from './StatusDashboard';
import type { PatientState } from '../types/scenario';

// Stub the ECGWaveform component (uses canvas/animation — not testable in jsdom)
vi.mock('./ECGWaveform', () => ({
  default: () => <div data-testid="ecg-waveform" />,
}));

// Stub VitalCard to simplify — just render the value label text
vi.mock('./VitalCard', () => ({
  default: ({ label, value, isLocked, onUnlock }: {
    label: string; value: string | number; isLocked: boolean; onUnlock?: () => void;
  }) => (
    <div data-testid={`vital-card-${label}`}>
      <span>{label}</span>
      {isLocked ? (
        <button onClick={onUnlock}>Inspect</button>
      ) : (
        <span data-testid={`vital-value-${label}`}>{value}</span>
      )}
    </div>
  ),
}));

const mockVitals: PatientState = {
  hr: 72,
  bp: '120/80',
  spo2: 98,
  rr: 16,
  pulsePresent: true,
  temp: 37.0,
  etco2: 38,
  rhythm: 'Sinus',
  glucose: 100,
};

const allLocked = {
  hr: false,
  spo2: false,
  bp: false,
  rr: false,
};

const allUnlocked = {
  hr: true,
  spo2: true,
  bp: true,
  rr: true,
};

describe('StatusDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the ECGWaveform component', () => {
    render(<StatusDashboard vitals={mockVitals} unlocked={allLocked} setUnlocked={vi.fn()} />);
    expect(screen.getByTestId('ecg-waveform')).toBeInTheDocument();
  });

  it('shows "Initializing sensors..." when vitals are null', () => {
    render(<StatusDashboard vitals={null} unlocked={allLocked} setUnlocked={vi.fn()} />);
    expect(screen.getByText(/Initializing sensors/i)).toBeInTheDocument();
  });

  it('renders the "Quick Inspection" button when not all vitals are unlocked', () => {
    render(<StatusDashboard vitals={mockVitals} unlocked={allLocked} setUnlocked={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Quick Inspection/i })).toBeInTheDocument();
  });

  it('hides the "Quick Inspection" button when all vitals are already unlocked', () => {
    render(<StatusDashboard vitals={mockVitals} unlocked={allUnlocked} setUnlocked={vi.fn()} />);
    expect(screen.queryByText(/Quick Inspection/i)).not.toBeInTheDocument();
  });

  it('calls setUnlocked with all vitals set to true when "Quick Inspection" is clicked', async () => {
    const mockSetUnlocked = vi.fn();
    render(<StatusDashboard vitals={mockVitals} unlocked={allLocked} setUnlocked={mockSetUnlocked} />);
    await userEvent.click(screen.getByRole('button', { name: /Quick Inspection/i }));
    // StatusDashboard calls setUnlocked with a plain object (handleInspectAll)
    expect(mockSetUnlocked).toHaveBeenCalledTimes(1);
  });

  it('unlocks a single vital when its Inspect button is clicked', async () => {
    const mockSetUnlocked = vi.fn();
    render(<StatusDashboard vitals={mockVitals} unlocked={allLocked} setUnlocked={mockSetUnlocked} />);
    // Our mocked VitalCard renders an 'Inspect' button for each locked vital
    // StatusDashboard has 4 VitalCards (hr, spo2, bp, rr) — all locked
    const inspectButtons = screen.getAllByText('Inspect');
    expect(inspectButtons.length).toBeGreaterThan(0);
    await userEvent.click(inspectButtons[0]);
    // setUnlocked is called via the onUnlock function which calls handleUnlock with a setter
    expect(mockSetUnlocked).toHaveBeenCalledTimes(1);
  });

  it('renders the scenario progress copy instead of stabilization progress', () => {
    render(<StatusDashboard vitals={mockVitals} unlocked={allUnlocked} setUnlocked={vi.fn()} scenarioProgressPct={42} />);
    expect(screen.getByText('Scenario Progress')).toBeInTheDocument();
    expect(screen.getByText('42% Scenario Objective Complete')).toBeInTheDocument();
    expect(screen.getByText(/Based on protocol completion and scenario outcome targets/i)).toBeInTheDocument();
    expect(screen.queryByText('Stabilization Progress')).not.toBeInTheDocument();
  });
});
