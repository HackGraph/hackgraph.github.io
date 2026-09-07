# Repeatable artifact verification — 7 September 2026 UTC

The earlier browser smoke test checked the shape of the manifest digest and a few developer-asset exclusions. Full staged-file comparisons and digest recomputation existed only as one-time local checks. Contributors and CI now have a repeatable command that performs that comparison without rebuilding the artifact:

```sh
npm run verify:build
```

## Implementation

[site-artifact.mjs](../tools/site-artifact.mjs) defines the publication inputs independently of the artifact's manifest. The policy names the top-level assets, three generated map pages, and engine files; it includes non-test JavaScript/CSS under `src/` and WOFF2 fonts. Test/spec files and test/fixture directories are excluded. Other source-file types and undeclared reference pages are excluded. Runtime JavaScript/CSS in `src/` remains public by convention; new fixed assets and map pages require a deliberate publication-list change.

Staging validates required source paths before replacing `.site/`, copies the selected regular files, injects build metadata, writes the manifest, and verifies the result. This also prevents an accidentally missing required input from deleting the previous build before the error is discovered.

[verify-site.mjs](../tools/verify-site.mjs) checks:

- The actual staged file list and the manifest's file list both match the publication policy. The artifact cannot authorize additional files by listing them in its own manifest.
- The input digest is recomputed from each sorted file path, a NUL separator, and its source bytes. The generated `.nojekyll` contributes an empty body. Missing, added, or changed publication inputs invalidate the earlier build.
- Every staged file matches its expected bytes. `src/buildInfo.js` is the intentional exception to a direct source copy: its expected contents are derived from the manifest, while its original source contents participate in the input digest.
- Manifest fields and date formats are valid. A non-null commit must still match a clean checkout at that commit. Source exports and dirty working trees can retain a null commit without inventing provenance.
- Published file paths contain no symbolic links. Staged JavaScript is read as bytes and never executed by verification.

The standalone command is read-only and exits nonzero on failure. It does not regenerate pages, refresh a manifest, or repair a mismatched file. The full `npm test` command ends with this verification. CI also runs it after generated-page parity checks and immediately before uploading `.site/`; the deployment job still does not rebuild.

## Regression coverage

[site-artifact.test.mjs](../tools/site-artifact.test.mjs) adds 20 tests using temporary generic fixtures. They cover publication exclusions, repeated-build byte stability, read-only verification, preserving the prior build when an input is missing, changed HTML/font/marker/build-metadata bytes, stale sources, runtime file additions/removals, extra or missing staged files, misleading manifest listings, path traversal entries, duplicate or reordered paths, an incorrect but well-formed digest, malformed metadata, symbolic links, and commit provenance. The CLI test proves that failure does not rebuild or repair the artifact. Git provenance tests use temporary repositories and do not commit this project.

This verifies consistency with the current publication inputs and the stated metadata. It is not a signed release attestation, proof of an independently trusted build time, a review of runtime behavior on every device, or evidence supporting security-domain claims. Hosted Actions execution and deployment remain unobserved.

The complete local suite passed 131 unit tests and 96 Chromium/Firefox/WebKit browser tests, followed by the standalone artifact check. Workflow YAML passed actionlint 1.7.12. All 68 public files still have input digest `22d83879052e0fd16f0e370b7dfe042dbc2a6a96d2f54fff303c76d455f8f481`, unchanged from the preceding content pass. Seven generated reading assets remained identical after regeneration. [artifact-verification.json](artifact-verification.json) records results and tooling hashes. No project commit, push, or deployment was performed.
