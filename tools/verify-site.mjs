import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifySite } from './site-artifact.mjs';

export { verifySite } from './site-artifact.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifySite(fileURLToPath(new URL('..', import.meta.url)));
    console.log(JSON.stringify({ verified: true, ...result }, null, 2));
  } catch (error) {
    console.error(`Staged-site verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
