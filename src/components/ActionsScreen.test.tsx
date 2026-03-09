import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('ActionsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the Actions heading', () => {
    render(<ActionsScreen applyIntervention={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Actions' })).toBeInTheDocument();
  });

  it('renders category section headings for each category that has actions', () => {
    render(<ActionsScreen applyIntervention={vi.fn()} />);
    // Category section labels appear as uppercase group headers inside the action list
    // These are h2 elements, not tabs
    const headings = screen.getAllByRole('heading');
    const headingTexts = headings.map(h => h.textContent?.toLowerCase() || '');
    // At minimum, 'interventions' and 'meds' categories should be present
    expect(headingTexts.some(t => t.includes('interventions'))).toBe(true);
    expect(headingTexts.some(t => t.includes('meds'))).toBe(true);
  });

  it('renders the CPR action card by default', () => {
    render(<ActionsScreen applyIntervention={vi.fn()} />);
    expect(screen.getByText('Initiate CPR (High-Quality)')).toBeInTheDocument();
  });

  it('filters actions by search query', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'naloxone');
    expect(screen.getByText(/Naloxone/i)).toBeInTheDocument();
    expect(screen.queryByText('Initiate CPR (High-Quality)')).not.toBeInTheDocument();
  });

  it('shows "No actions found" message when search has no results', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'xyznonexistent12345');
    expect(screen.getByText(/No actions found matching/i)).toBeInTheDocument();
  });

  it('clicking "Clear Search" resets the filter', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'xyznonexistent12345');
    await userEvent.click(screen.getByText('Clear Search'));
    expect(screen.getByText('Initiate CPR (High-Quality)')).toBeInTheDocument();
  });

  it('opens the ProcedureGuide modal when an action card is clicked', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} />);
    // Click on the CPR action card button
    await userEvent.click(screen.getByText('Initiate CPR (High-Quality)'));
    // ProcedureGuide should now be visible
    expect(screen.getByTestId('procedure-guide')).toBeInTheDocument();
  });

  it('calls applyIntervention when ProcedureGuide confirm is clicked', async () => {
    const mockApply = vi.fn();
    render(<ActionsScreen applyIntervention={mockApply} />);
    await userEvent.click(screen.getByText('Initiate CPR (High-Quality)'));
    // Click the confirm button in the mocked ProcedureGuide
    await userEvent.click(screen.getByTestId('confirm-btn'));
    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith('cpr');
  });

  it('closes the ProcedureGuide modal when Close is clicked', async () => {
    render(<ActionsScreen applyIntervention={vi.fn()} />);
    await userEvent.click(screen.getByText('Initiate CPR (High-Quality)'));
    expect(screen.getByTestId('procedure-guide')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('procedure-guide')).not.toBeInTheDocument();
  });
});
