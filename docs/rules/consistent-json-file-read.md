# consistent-json-file-read

📝 Enforce consistent JSON file reads before `JSON.parse()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When reading and parsing a JSON file, consistently read it as a string.

This keeps the code compatible with TypeScript, where [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) accepts a string.

The rule only checks and fixes direct no-option reads and option objects where `encoding` is the only property. Reads with additional options are left unchanged to avoid dropping options.

## Examples

```js
// ❌
const packageJson = JSON.parse(await fs.readFile('./package.json'));

// ❌
const promise = fs.readFile('./package.json');
const packageJson = JSON.parse(await promise);

// ✅
const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
```

```js
// ✅
const promise = fs.readFile('./package.json', {encoding: 'utf8', signal});
const packageJson = JSON.parse(await promise);
```

## Options

Type: `'string' | 'buffer'`

Default: `'string'`

### `buffer`

Prefer reading JSON files as buffers.

```js
// eslint unicorn/consistent-json-file-read: ["error", "buffer"]

// ❌
const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));

// ✅
const packageJson = JSON.parse(await fs.readFile('./package.json'));
```
