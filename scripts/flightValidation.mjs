// Flies every sourced validation case through the flight model and prints
// sourced vs simulated tables (Markdown) with the percentage difference.
// Usage: npm run validate

import { AIRCRAFT, common } from '../src/aircraft/index.js';
import { runValidation, validationReport } from '../src/physics/validation.js';

console.log(validationReport(runValidation(AIRCRAFT, common), AIRCRAFT));
