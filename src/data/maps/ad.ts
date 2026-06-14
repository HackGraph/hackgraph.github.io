import type { MapDefinition } from '../schema';
import {
  initialAccessNodes,
  initialAccessEdges,
} from '../chains/initial-access';
import {
  credentialAccessNodes,
  credentialAccessEdges,
} from '../chains/credential-access';
import {
  domainDominanceNodes,
  domainDominanceEdges,
} from '../chains/domain-dominance';
import { adAdditionNodes, adAdditionEdges } from '../chains/ad-additions';
import { adCategoryNodes, adCategoryEdges } from '../chains/ad-categories';
import {
  ntlmRelayCveNodes,
  ntlmRelayCveEdges,
} from '../chains/ntlm-relay-cve';
import { adTrustNodes, adTrustEdges } from '../chains/ad-trusts';
import { adSccmNodes, adSccmEdges } from '../chains/ad-sccm';
import { adPersistCredNodes, adPersistCredEdges } from '../chains/ad-persist-cred';
import { adCoverageNodes, adCoverageEdges } from '../chains/ad-coverage';
import { adNetexecNodes, adNetexecEdges } from '../chains/ad-netexec';
import { adBoxesNodes, adBoxesEdges } from '../chains/ad-boxes';
import { adAdcsExtraNodes, adAdcsExtraEdges } from '../chains/ad-adcs-extra';
import { adConvergenceNodes, adConvergenceEdges } from '../chains/ad-convergence';

/**
 * The Active Directory attack map — three converging chains assembled into one
 * DAG. Add more techniques by editing the chain files; add an entirely new
 * domain by creating a sibling map and registering it in ../index.ts.
 */
export const adMap: MapDefinition = {
  id: 'ad',
  name: 'Active Directory',
  tagline: 'From zero access to Domain Admin & persistence',
  rootId: 'start',
  // A curated, sophisticated palette with real (but never neon) saturation —
  // carried on each card's phase label + dot. Laid out by phase column, it reads
  // as an intentional left→right gradient, not a chaotic rainbow.
  // Warm ANALOGOUS palette tuned to the red accent — gold → amber → orange →
  // coral, then rose → pink → magenta → plum. All on the warm/magenta half of
  // the wheel (no blue/green/teal, which clash with red); pure red is reserved
  // for the active-path accent so the phase dots never blend into it.
  phases: [
    // High-contrast spectrum: 8 vivid, evenly-spaced hues so the stages read clearly
    // apart (user wanted maximum separation). Pure red is skipped (…orange → pink…)
    // and reserved for the lit-path accent so phase dots never blend into it.
    { id: 'recon', label: 'Reconnaissance', color: '#3f9ae8' },
    { id: 'initial-access', label: 'Initial Access', color: '#19b3a3' },
    { id: 'enumeration', label: 'Enumeration', color: '#5fc24a' },
    { id: 'credential-access', label: 'Credential Access', color: '#e0b12f' },
    { id: 'priv-esc', label: 'Privilege Escalation', color: '#ef8630' },
    { id: 'lateral-movement', label: 'Lateral Movement', color: '#ec5a97' },
    { id: 'domain-dominance', label: 'Domain Dominance', color: '#a94fdb' },
    { id: 'persistence', label: 'Persistence', color: '#5f6ce6' },
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
