# prefer-dispose

📝 Prefer using `using`/`await using` over manual `try`/`finally` resource disposal.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[Explicit Resource Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) (the `using` and `await using` declarations) disposes of a resource automatically when the enclosing block exits, replacing the manual `try`/`finally` pattern. It also disposes multiple resources in reverse order and, unlike a hand-written `finally`, preserves the original error when a disposer throws (via [`SuppressedError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SuppressedError)) instead of silently replacing it.

This rule flags a `try`/`finally` whose only purpose is disposing of a resource declared just before it, and suggests converting it to a `using` declaration.

> [!NOTE]
> `using foo = …` requires the value to implement [`Symbol.dispose`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/dispose) (or `Symbol.asyncDispose` for `await using`); a value that merely has a `.close()` method does not qualify and throws a `TypeError` at runtime. Because this cannot be verified without type information, the rule only offers a suggestion (never an autofix). When [type-aware linting](https://typescript-eslint.io/getting-started/typed-linting/) is enabled, it additionally confirms the resource is disposable before reporting.

Explicit Resource Management reached [Stage 4](https://github.com/tc39/proposal-explicit-resource-management) and is part of ECMAScript 2026. It ships in recent versions of Node.js and Chromium; for older environments, transpile with TypeScript or Babel.

## Examples

```js
// ❌
const file = open();
try {
	read(file);
} finally {
	file.close();
}

// ✅
{
	using file = open();
	read(file);
}
```

```js
// ❌
const reader = openReader();
const writer = openWriter();
try {
	pipe(reader, writer);
} finally {
	writer.close();
	reader.close();
}

// ✅
{
	using reader = openReader();
	using writer = openWriter();
	pipe(reader, writer);
}
```

```js
// ❌
async function run() {
	const connection = await connect();
	try {
		await query(connection);
	} finally {
		await connection.close();
	}
}

// ✅
async function run() {
	await using connection = await connect();
	await query(connection);
}
```
