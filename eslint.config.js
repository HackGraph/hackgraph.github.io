import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // The engine is plain browser script, not a module: `engine.js` and `view.js` publish
    // themselves on globalThis and are loaded with a <script> tag standalone. Linted here
    // now that it lives in this repo rather than being copied in from a sibling directory.
    files: ['engine/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      // `module` and `require` appear only inside `typeof` guards, for the CommonJS
      // consumers (Vitest) that load these files without a bundler.
      globals: { ...globals.browser, ...globals.commonjs },
    },
    // Spread the recommended RULES, not the whole config object: a `rules` key placed
    // after `...js.configs.recommended` replaces it wholesale, which silently lints the
    // engine with no rules at all and reports a clean pass.
    rules: {
      ...js.configs.recommended.rules,
      // The input sanitisers match control characters ON PURPOSE — stripping them out of
      // commands and colours is the whole job. Flagging them here only invites someone to
      // "fix" the regex that keeps a payload from reaching the clipboard.
      'no-control-regex': 'off',
    },
  },
  {
    files: ['engine/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
