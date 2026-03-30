import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionsScreen from './ActionsScreen';

// ProcedureGuide uses a modal with portal. Stub it so renders don't throw.
// It renders its children in-place and exposes an onConfirm button.
vi.mock('./ProcedureGuide', () => ({
  default: ({ isOpen, onClose, onConfirm, title }: {
    isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string;
  }) => isOpen ? (
    <div data-testid="procedure-guide">
      <span>{title}</span>
      <button onClick={onClose}>Close</button>
      <button data-testid="confirm-btn" onClick={onConfirm}>Confirm</button>
    </div>
  ) : null,
}));

function getActionButton(label: string): HTMLButtonElement {
  const button = screen.getByText(label).closest('button');

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find action button for ${label}`);
  }

  return button;
}

describe('ActionsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the Actions heading', () => {
    render(<ActionsScreen applyIntervention={vi.fn()} activeInterventions={[]} elapsedSec={0} />);
    expect(screen.getByRole('heading', { name: 'Actions' })).toBeInTheDocument();
  });

  it('renders category section headings for each category that has actions', () => {
    render(<ActionsScreen applyIntervention={vi.fn()} activeInterventions={[]} elapsedSec={0} />);
    // Category section labels appear as uppercase group headers inside the action list
    // These are h2 elements, not tabs
    const headings = screen.getAllByRole('heading');
    const headingTexts = headings.map(h => h.textContent?.toLowerCase() || '');
    // At minimum, 'interventions' and 'meds' categories should be present
    expect(headingTexts.some(t => t.includes('interventions'))).toBe(true);
    expect(headingTexts.some(t => t.includes('meds'))).toBe(true);
  });

  it('renders the CPR action card by default', () => {
    render(<ActionsScreen applyIntervention={vi.fn()} activeInterventions={[]} elapsedSec={0} />);
    expect(screen.getByText('Initiate CPR (High-Quality)')).toBeInTheDocument();
  });

  it('filters actions by search query', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} activeInterventions={[]} elapsedSec={0} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'naloxone');
    expect(screen.getAllByText(/Naloxone/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Initiate CPR (High-Quality)')).not.toBeInTheDocument();
  });

  it('shows "No actions found" message when search has no results', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} activeInterventions={[]} elapsedSec={0} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'xyznonexistent12345');
    expect(screen.getByText(/No actions found matching/i)).toBeInTheDocument();
  });

  it('clicking "Clear Search" resets the filter', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} activeInterventions={[]} elapsedSec={0} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'xyznonexistent12345');
    await userEvent.click(screen.getByText('Clear Search'));
    expect(screen.getByText('Initiate CPR (High-Quality)')).toBeInTheDocument();
  });

  it('opens the ProcedureGuide modal when an action card is clicked', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} activeInterventions={[]} elapsedSec={0} />);
    // Click on the CPR action card button
    await userEvent.click(screen.getByText('Initiate CPR (High-Quality)'));
    // ProcedureGuide should now be visible
    expect(screen.getByTestId('procedure-guide')).toBeInTheDocument();
  });

  it('calls applyIntervention when ProcedureGuide confirm is clicked', async () => {
    const mockApply = vi.fn();
    render(<ActionsScreen applyIntervention={mockApply} activeInterventions={[]} elapsedSec={0} />);
    await userEvent.click(screen.getByText('Initiate CPR (High-Quality)'));
    // Click the confirm button in the mocked ProcedureGuide
    await userEvent.click(screen.getByTestId('confirm-btn'));
    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith('cpr');
  });

  it('closes the ProcedureGuide modal when Close is clicked', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} activeInterventions={[]} elapsedSec={0} />);
    await userEvent.click(screen.getByText('Initiate CPR (High-Quality)'));
    expect(screen.getByTestId('procedure-guide')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('procedure-guide')).not.toBeInTheDocument();
  });

  it('renders a cooldown pill and supporting sub-line for timed unavailable actions', () => {
    render(
      <ActionsScreen
        applyIntervention={vi.fn()}
        activeInterventions={[{ id: 'cpr', start_time: 0, duration_sec: 120 }]}
        elapsedSec={70}
      />
    );

    const cprButton = getActionButton('Initiate CPR (High-Quality)');
    const currentInterventions = screen.getByRole('list', { name: 'Current interventions summary' });

    expect(cprButton).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Available again later' })).toBeInTheDocument();
    expect(within(cprButton).getByText('Active now')).toBeInTheDocument();
    expect(within(cprButton).getByText('Available again in 50s')).toBeInTheDocument();
    expect(
      within(cprButton).getByText('Intervention timer still running. Only this same action is temporarily unavailable.')
    ).toBeInTheDocument();
    expect(within(currentInterventions).getByText('CPR (High-Quality)')).toBeInTheDocument();
    expect(within(currentInterventions).getByText('Intervention timer · 50s')).toBeInTheDocument();
  });

  it('available actions do not render the cooldown treatment', () => {
    render(
      <ActionsScreen
        applyIntervention={vi.fn()}
        activeInterventions={[{ id: 'cpr', start_time: 0, duration_sec: 120 }]}
        elapsedSec={70}
      />
    );

    const ivButton = getActionButton('Establish IV/IO Access');

    expect(ivButton).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Available now' })).toBeInTheDocument();
    expect(within(ivButton).getByText('Available now')).toBeInTheDocument();
    expect(within(ivButton).queryByText(/Available again in/i)).not.toBeInTheDocument();
    expect(
      within(ivButton).queryByText('Intervention timer still running. Only this same action is temporarily unavailable.')
    ).not.toBeInTheDocument();
  });

  it('keeps cooldown actions disabled and non-interactive', async () => {
    const user = userEvent.setup();

    render(
      <ActionsScreen
        applyIntervention={vi.fn()}
        activeInterventions={[{ id: 'cpr', start_time: 0, duration_sec: 120 }]}
        elapsedSec={70}
      />
    );

    const cprButton = getActionButton('Initiate CPR (High-Quality)');

    await user.click(cprButton);

    expect(cprButton).toBeDisabled();
    expect(screen.queryByTestId('procedure-guide')).not.toBeInTheDocument();
  });

  it('renders mixed action states correctly when multiple timed actions are active', () => {
    render(
      <ActionsScreen
        applyIntervention={vi.fn()}
        activeInterventions={[
          { id: 'cpr', start_time: 0, duration_sec: 60 },
          { id: 'defibrillate', start_time: 0, duration_sec: 10 },
        ]}
        elapsedSec={5}
      />
    );

    const cprButton = getActionButton('Initiate CPR (High-Quality)');
    const defibrillateButton = getActionButton('Defibrillate (AED / Manual)');
    const epiButton = getActionButton('Epinephrine 1mg IV/IO');
    const currentInterventions = screen.getByRole('list', { name: 'Current interventions summary' });

    expect(within(cprButton).getByText('Available again in 55s')).toBeInTheDocument();
    expect(within(defibrillateButton).getByText('Available again in 5s')).toBeInTheDocument();
    expect(screen.getAllByText('Intervention timer still running. Only this same action is temporarily unavailable.')).toHaveLength(2);
    expect(cprButton).toBeDisabled();
    expect(defibrillateButton).toBeDisabled();
    expect(epiButton).toBeEnabled();
    expect(within(epiButton).queryByText(/Available again in/i)).not.toBeInTheDocument();
    expect(within(currentInterventions).getByText('CPR (High-Quality)')).toBeInTheDocument();
    expect(within(currentInterventions).getByText('Defibrillate (AED/Manual)')).toBeInTheDocument();
  });

  it('shows a semantic state summary so action availability is easier to scan', () => {
    render(
      <ActionsScreen
        applyIntervention={vi.fn()}
        activeInterventions={[{ id: 'cpr', start_time: 0, duration_sec: 120 }]}
        elapsedSec={70}
      />
    );

    const summary = screen.getByRole('region', { name: 'Live action state summary' });

    expect(within(summary).getByText('Available now')).toBeInTheDocument();
    expect(within(summary).getAllByText('Active now').length).toBeGreaterThan(0);
    expect(within(summary).getByText('Available again later')).toBeInTheDocument();
    expect(within(summary).getByText('Unavailable for another reason')).toBeInTheDocument();
  });
});
