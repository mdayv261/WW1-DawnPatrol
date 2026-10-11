// Induced drag of biplanes and triplanes, after Prandtl, "Induced Drag of
// Multiplanes", NACA Technical Note 182 (1924).
//
// Stacked wings with a vertical gap interfere less than one wing of the same
// span carrying all the lift, so a multiplane has LESS induced drag than a
// monoplane of the upper span. Prandtl expresses this as
//   kappa = D / D_I,   D_I = L^2 / (pi q b1^2)  (monoplane of the upper span b1)
// Stagger does not change the total (Munk's law, TN-182 p.4), so only spans
// and vertical gaps matter.
//
// Every number below is quoted from TN-182 (see docs/AIRCRAFT_DATA.md).

import { PRANDTL } from '../core/constants.js';

// Mutual-influence coefficient sigma for two wings of EQUAL span b and gap G.
// TN-182 equation (5), stated valid for 1/15 <= G/b <= 1/2.
export function sigmaEqualSpan(gapOverSpan) {
  const g = gapOverSpan;
  return (1 - PRANDTL.SIGMA_A * g) / (PRANDTL.SIGMA_B + PRANDTL.SIGMA_C * g);
}

// sigma for two wings of spans b1, b2 and vertical gap G.
// TN-182 equation (6): first sigma1 at the mean span, then the correction.
export function sigmaPair(b1, b2, gap) {
  const bm = (b1 + b2) / 2;
  const s1 = sigmaEqualSpan(gap / bm);
  const r = Math.min(b1, b2) / Math.max(b1, b2); // sigma is the same for r and 1/r
  const s = 0.8 * s1 * (1 - s1) - 0.1;
  const t = 0.56 / (s1 + s - 0.22);
  const tau = (1 - r) / (1 + r);
  return s1 + s - Math.sqrt(s * s + (tau / t) ** 2);
}

// Solve a small linear system A x = y (Gaussian elimination, n <= 3 here).
function solve(A, y) {
  const n = y.length;
  const M = A.map((row, i) => [...row, y[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// kappa for any stack of wings, each { span, height } (height = vertical
// position in metres; only differences matter). The lift is shared between
// the wings in the way that gives least drag, as Prandtl assumes.
//
// Total drag is D = (1/(pi q)) * sum_ij sigma_ij L_i L_j / (b_i b_j), with
// sigma_ii = 1 (TN-182 equations 3, 7 and 10). Minimising over the lift
// split with sum L_i = L gives D = L^2 / (pi q * 1^T M^-1 1), where
// M_ij = sigma_ij / (b_i b_j), so kappa = b1^2 / (1^T M^-1 1).
// For two equal wings this reduces to TN-182 (9a): kappa = (1 + sigma) / 2.
export function multiplaneKappa(wings) {
  if (wings.length === 1) return 1;
  const b1 = Math.max(...wings.map((w) => w.span));
  const M = wings.map((wi, i) =>
    wings.map((wj, j) => {
      const sigma = i === j ? 1 : sigmaPair(wi.span, wj.span, Math.abs(wi.height - wj.height));
      return sigma / (wi.span * wj.span);
    }),
  );
  const x = solve(M, wings.map(() => 1));
  const sum = x.reduce((a, b) => a + b, 0);
  return (b1 * b1) / sum;
}
