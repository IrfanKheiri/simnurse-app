// Vitest 4 injects globals AFTER setup files are evaluated, so importing
// @testing-library/jest-dom directly (which calls expect.extend at load time)
// causes "expect is not defined" and silently kills every test suite.
//
// The correct approach for Vitest 4 is to import only the matchers object and
// extend expect ourselves using the Vitest import — which IS available at this
// point via the module system.
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);
