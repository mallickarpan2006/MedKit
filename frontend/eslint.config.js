import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // This legacy JavaScript app uses effects for RPC synchronization and has no
      // TypeScript type model. Keep correctness checks enabled while avoiding false
      // positives from React 19's stricter experimental rules.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'no-unused-vars': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
])
