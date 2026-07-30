import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      // The "omit a property via rest destructuring" idiom (e.g.
      // `const { unwanted, ...rest } = obj`) intentionally leaves the
      // omitted binding unused; don't flag that as a real unused variable.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // tsc cannot catch a discarded promise: Response.json() accepts any, so a
      // Promise serialises to {}, and an unawaited db.insert(...) is a legal
      // discarded expression that may never complete before a serverless freeze.
      // These two rules are the actual gate on the async conversion.
      "@typescript-eslint/no-floating-promises": "error",
      // checksVoidReturn.attributes is off because `onClick={asyncFn}` is a
      // supported React pattern, not a defect; React discards the returned
      // promise deliberately. Every other check stays on, including the
      // void-return checks that matter on the server.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
