// Copy an explicit public surface. Development packages and audit artifacts never
// enter the Pages upload, even though local development serves the repository.
import { contentCoverage, glossaryCoverage, relationshipCoverage } from './audit-content.mjs';
import { fileURLToPath } from 'node:url';
import { stageSite } from './site-artifact.mjs';
import { verifyProvenance } from './source-provenance.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
await verifyProvenance();
const evidenceErrors = [...contentCoverage().flatMap(map => map.errors), ...glossaryCoverage().errors, ...relationshipCoverage().errors];
if (evidenceErrors.length) throw new Error('Content checks failed before staging: ' + JSON.stringify(evidenceErrors));
await import('./gen-reference.mjs');
const manifest = await stageSite(root);
console.log(`Staged and verified ${manifest.files.length} public files in .site (${manifest.sourceDigest.slice(0, 12)})`);
