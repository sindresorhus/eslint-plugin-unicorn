# empty-brace-spaces

📝 Enforce no spaces between braces.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Empty blocks and object literals do not need internal whitespace, so this rule enforces a compact, consistent style. It also checks objects and arrays in JSON, JSONC, and JSON5, blocks in CSS, flow mappings and sequences in YAML, and inline tables and arrays in TOML. Braces and brackets containing comments are left unchanged.

## Examples

```js
// ❌
class Unicorn {
}

// ✅
class Unicorn {}
```

```js
// ❌
try {
	foo();
} catch { }

// ✅
try {
	foo();
} catch {}
```
