import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'package-lock.json', 'src/components/ui'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // ponytail: solo las dos reglas clásicas del plugin (reglas de hooks y
      // dependencias de efectos). Las nuevas reglas "compiler" de la v7
      // (set-state-in-effect, purity, etc.) exigen reescribir cada pantalla
      // con fetch en useEffect; fuera del alcance de esta pieza.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
)
