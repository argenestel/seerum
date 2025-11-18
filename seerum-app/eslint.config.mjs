import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow 'any' types (warn instead of error for deployment)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused variables that start with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // React compiler warnings should not block deployment
      "react-hooks/preserve-manual-memoization": "warn",
      // Next.js image warnings should not block deployment
      "@next/next/no-img-element": "warn",
      // React unescaped entities warnings
      "react/no-unescaped-entities": "warn",
      // React hooks setState in effect warnings
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
