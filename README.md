# SimNurse

A scenario-based clinical nursing simulator that allows learners to practice patient assessment and intervention skills in a realistic, timed simulation environment. Built entirely as a client-side React application with no backend runtime.

## Overview

SimNurse is an interactive web-based simulator where:

- **Learners** select a clinical scenario and observe a simulated patient deteriorating or stabilizing over time
- **Vital signs and rhythm** evolve based on baseline progression and learner interventions
- **Actions** (treatments, medications, procedures) are selected from a searchable catalog with clinical guidance
- **Outcomes** are tracked and evaluated in real-time based on success/failure conditions
- **Debriefs** provide scored feedback on accepted vs. rejected actions and clinical outcomes

## Features

- **Real-time Patient Simulation**: Time-based progression of vitals, rhythm, and patient state
- **Intervention Engine**: Tracks applied treatments and evaluates clinical appropriateness
- **Vital Monitoring**: ECG waveforms, heart rate, SpO₂, blood pressure, respiratory rate
- **Procedure Guidance**: Context-aware instruction overlays for selected actions
- **Session Logging**: Comprehensive event tracking for debrief and performance analysis
- **Responsive Design**: Adapts across desktop, tablet, and mobile devices
- **Comprehensive Testing**: Unit tests, component tests, and multi-device E2E tests

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS
- **Testing**: Vitest (unit), Playwright (E2E with multi-device support)
- **Persistence**: Dexie.js (IndexedDB wrapper) for scenario definitions and session logs
- **Linting**: ESLint
- **Build**: TypeScript compiler with Vite optimization

## Getting Started

### Prerequisites

- Node.js 16+ (npm or yarn)

### Installation

```bash
npm install
```

### Development

Start the development server with hot module replacement:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

Optimized production build output to `dist/`

### Preview

Preview production build locally:

```bash
npm run preview
```

## Testing

### Unit & Component Tests

```bash
npm run test
```

### End-to-End Tests

Run E2E tests in headless mode:

```bash
npm run test:e2e
```

Run with interactive UI:

```bash
npm run test:e2e:ui
```

Run with visible browser:

```bash
npm run test:e2e:headed
```

Run in specific browser:

```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

Run on mobile/tablet devices:

```bash
npm run test:e2e:mobile
npm run test:e2e:ipad
```

Run across multiple breakpoints:

```bash
npm run test:e2e:breakpoints
```

View test report:

```bash
npm run test:e2e:report
```

Update snapshots:

```bash
npm run test:e2e:update-snapshots
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── App.tsx                 # Main router and app orchestration
├── components/             # React components (PatientView, ActionScreen, etc.)
├── hooks/                  # Custom hooks (useScenarioEngine - simulation engine)
├── lib/                    # Utilities (database, scenario progress)
├── data/                   # Seeded scenario definitions
├── types/                  # TypeScript type definitions
├── assets/                 # Images and static assets
└── index.css               # Global styles
db/
├── schema.sql             # IndexedDB schema definitions
docs/
├── architecture.md        # System design and data flow
├── functionality.md       # Learner experience breakdown
└── ...                    # Additional documentation
tests/                     # E2E tests
playwright.config.ts       # Playwright configuration
tailwind.config.js         # Tailwind CSS configuration
vite.config.ts            # Vite configuration
```

## Architecture Highlights

### Simulation Engine

The `useScenarioEngine` hook drives the simulation with a reducer-based state machine that:
- Advances time every 3 seconds
- Applies baseline vital progression
- Evaluates and applies learner interventions
- Manages scheduled state transitions (e.g., cardiac arrest)
- Persists all events to IndexedDB for debrief generation
- Evaluates success/failure conditions

### Data Persistence

- **Seeded Scenarios**: Loaded from `seedScenarios.ts` into Dexie on app start
- **Session Logs**: Each simulation run stores typed event records for complete audit trail
- **LocalStorage**: No backend required; all data stays in the browser

### Component Architecture

- **PatientView**: Bedside clinical display with narrative notes
- **ActionsScreen**: Searchable action catalog with procedure guidance
- **StatusDashboard**: Vital sign monitoring and rhythm display
- **EvaluationSummary**: Post-simulation debrief with scoring

## Documentation

For detailed information, see:

- [Architecture](docs/architecture.md) - System design and runtime flow
- [Functionality](docs/functionality.md) - Learner experience walkthrough
- [Repository Structure](docs/repo-structure.md) - File organization

## Contributing

- Follow TypeScript and React best practices
- Write tests for new features (unit + E2E where appropriate)
- Use Tailwind CSS for styling
- Keep components focused and composable
- Update documentation for significant changes
