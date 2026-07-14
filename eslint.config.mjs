import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ['src/**/*.jsx', 'src/**/*.js'],
    rules: {
      // #EBE9E4 inside the Liftly mark (src/components/ui/Logo.jsx, src/app/icon.js)
      // is brand art, not a themeable surface color — exempt from this rule.
      'no-restricted-syntax': ['warn', {
        selector: "Literal[value=/(bg-indigo-6|bg-indigo-7|bg-white|text-slate-|bg-slate-)/]",
        message: 'Raw palette class — use semantic tokens (bg-training, bg-card, text-muted-foreground, ...).',
      }],
    },
  },
]);

export default eslintConfig;
