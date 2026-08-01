import {
  initialAccessNodes,
  initialAccessEdges,
} from '../chains/initial-access.js';
import {
  credentialAccessNodes,
  credentialAccessEdges,
} from '../chains/credential-access.js';
import {
  domainDominanceNodes,
  domainDominanceEdges,
} from '../chains/domain-dominance.js';
import { adAdditionNodes, adAdditionEdges } from '../chains/ad-additions.js';
import { adCategoryNodes, adCategoryEdges } from '../chains/ad-categories.js';
import {
  ntlmRelayCveNodes,
  ntlmRelayCveEdges,
} from '../chains/ntlm-relay-cve.js';
import { adTrustNodes, adTrustEdges } from '../chains/ad-trusts.js';
import { adSccmNodes, adSccmEdges } from '../chains/ad-sccm.js';
import { adPersistCredNodes, adPersistCredEdges } from '../chains/ad-persist-cred.js';
import { adCoverageNodes, adCoverageEdges } from '../chains/ad-coverage.js';
import { adNetexecNodes, adNetexecEdges } from '../chains/ad-netexec.js';
import { adBoxesNodes, adBoxesEdges } from '../chains/ad-boxes.js';
import { adAdcsExtraNodes, adAdcsExtraEdges } from '../chains/ad-adcs-extra.js';
import { adConvergenceNodes, adConvergenceEdges } from '../chains/ad-convergence.js';

/**
 * The Active Directory attack map: three converging chains assembled into one
 * DAG. Add more techniques by editing the chain files; add an entirely new
 * domain by creating a sibling map and registering it in ../index.ts.
 */
/** @type {import('../schema.js').MapDefinition} */
export const adMap = {
  id: 'ad',
  name: 'Active Directory',
  tagline: 'From zero access to Domain Admin & persistence',
  rootId: 'start',
  // A curated, sophisticated palette with real (but never neon) saturation,
  // carried on each card's phase label + dot. Laid out by phase column, it reads
  // as an intentional left→right gradient, not a chaotic rainbow.
  // Warm ANALOGOUS palette tuned to the red accent: gold → amber → orange →
  // coral, then rose → pink → magenta → plum. All on the warm/magenta half of
  // the wheel (no blue/green/teal, which clash with red); pure red is reserved
  // for the active-path accent so the phase dots never blend into it.
  phases: [
    // 8 hues at EQUAL OKLCH lightness/chroma (0.70 / 0.13) — hue-only variation so no
    // phase shouts (the old yellow) or recedes (the old blue/purple); every stage
    // carries the same visual weight on the dark ground. Hues derived from the prior
    // hexes, spaced ≥27° apart. Pure red is reserved for the lit-path accent.
    { id: 'recon', label: 'Reconnaissance', color: 'oklch(0.70 0.13 248)' },
    { id: 'initial-access', label: 'Initial Access', color: 'oklch(0.70 0.13 183)' },
    { id: 'enumeration', label: 'Enumeration', color: 'oklch(0.70 0.13 140)' },
    { id: 'credential-access', label: 'Credential Access', color: 'oklch(0.70 0.13 87)' },
    { id: 'priv-esc', label: 'Privilege Escalation', color: 'oklch(0.70 0.13 55)' },
    { id: 'lateral-movement', label: 'Lateral Movement', color: 'oklch(0.70 0.13 357)' },
    { id: 'domain-dominance', label: 'Domain Dominance', color: 'oklch(0.70 0.13 311)' },
    { id: 'persistence', label: 'Persistence', color: 'oklch(0.70 0.13 275)' },
  ],
  nodes: [
    ...initialAccessNodes,
    ...credentialAccessNodes,
    ...domainDominanceNodes,
    ...adAdditionNodes,
    ...adCategoryNodes,
    ...ntlmRelayCveNodes,
    ...adTrustNodes,
    ...adSccmNodes,
    ...adPersistCredNodes,
    ...adCoverageNodes,
    ...adNetexecNodes,
    ...adBoxesNodes,
    ...adAdcsExtraNodes,
    ...adConvergenceNodes,
  ],
  edges: [
    ...initialAccessEdges,
    ...credentialAccessEdges,
    ...domainDominanceEdges,
    ...adAdditionEdges,
    ...adCategoryEdges,
    ...ntlmRelayCveEdges,
    ...adTrustEdges,
    ...adSccmEdges,
    ...adPersistCredEdges,
    ...adCoverageEdges,
    ...adNetexecEdges,
    ...adBoxesEdges,
    ...adAdcsExtraEdges,
    ...adConvergenceEdges,
  ],
};
