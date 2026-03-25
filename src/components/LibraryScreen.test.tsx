import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryScreen from './LibraryScreen';
import type { Scenario } from '../types/scenario';

// --- Mock Dexie + dexie-react-hooks ---
// useLiveQuery returns the value from its callback synchronously in tests
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => unknown) => fn(),
}));

// Mock the db module so no real IndexedDB is hit
vi.mock('../lib/db', () => ({
  db: {
    scenarios: {
      toArray: vi.fn(),
    },
    sessionLogs: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          reverse: vi.fn(() => ({
            toArray: vi.fn().mockReturnValue([]),
          })),
        })),
      })),
    },
  },
}));

// Import db AFTER mocking so we get the mocked version
import { db } from '../lib/db';

const mockScenarios: Partial<Scenario>[] = [
  {
    scenario_id: 'scenario-1',
    title: 'Adult VFib Arrest (Witnessed)',
    initial_state: { hr: 0, bp: '0/0', spo2: 75, rr: 0, temp: 36.6, etco2: 0, rhythm: 'VFib', pulsePresent: false, glucose: 100 },
    baseline_progressions: [],
    interventions: {},
    success_conditions: [],
    failure_conditions: [],
  },
  {
    scenario_id: 'scenario-2',
    title: 'Adult Stroke (CVA)',
    initial_state: { hr: 90, bp: '170/95', spo2: 95, rr: 16, temp: 37.0, etco2: 38, rhythm: 'Sinus', pulsePresent: true, glucose: 60 },
    baseline_progressions: [],
    interventions: {},
    success_conditions: [],
    failure_conditions: [],
  },
];

const toArrayMock = db.scenarios.toArray as Mock;

describe('LibraryScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner when scenarios are undefined', () => {
    toArrayMock.mockReturnValue(undefined);
    render(<LibraryScreen onSelectScenario={vi.fn()} />);
    // The loading state is a spinner div with animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('shows the "Library Empty" state when no scenarios exist', () => {
    toArrayMock.mockReturnValue([]);
    render(<LibraryScreen onSelectScenario={vi.fn()} />);
    expect(screen.getByText('Library Empty')).toBeInTheDocument();
    expect(screen.getByText(/No scenarios found/i)).toBeInTheDocument();
  });

  it('renders a card for each scenario in the database', () => {
    toArrayMock.mockReturnValue(mockScenarios);
    render(<LibraryScreen onSelectScenario={vi.fn()} />);
    expect(screen.getByText('Adult VFib Arrest (Witnessed)')).toBeInTheDocument();
    expect(screen.getByText('Adult Stroke (CVA)')).toBeInTheDocument();
  });

  it('calls onSelectScenario with the correct scenario when a card is clicked', async () => {
    const mockSelectFn = vi.fn();
    toArrayMock.mockReturnValue(mockScenarios);
    render(<LibraryScreen onSelectScenario={mockSelectFn} />);

    await userEvent.click(screen.getByText('Adult VFib Arrest (Witnessed)'));
    await userEvent.click(screen.getByRole('button', { name: /Begin/i }));
    expect(mockSelectFn).toHaveBeenCalledTimes(1);
    expect(mockSelectFn).toHaveBeenCalledWith(expect.objectContaining({ scenario_id: 'scenario-1' }));
  });

  it('renders the Simulations header and subtitle', () => {
    toArrayMock.mockReturnValue([]);
    render(<LibraryScreen onSelectScenario={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Simulations' })).toBeInTheDocument();
    expect(screen.getByText(/Select a clinical case to begin/i)).toBeInTheDocument();
  });
});

