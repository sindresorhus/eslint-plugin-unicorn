# require-text-decoder-streaming

📝 Require streaming decoding of fetch-body chunks with `TextDecoder`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- The examples use UTF-8; the rule also checks other encodings. -->

Fetch-body chunks can end in the middle of a multibyte character. Decoding each chunk independently can corrupt text: decoding the bytes of `€` as separate chunks produces `���` instead.

The [Encoding Standard](https://encoding.spec.whatwg.org/#interface-textdecoder) describes incremental decoding with the same `TextDecoder` instance: pass `{stream: true}` for each chunk, then consume the result of a final `decoder.decode()` call. The final call flushes any buffered bytes and handles incomplete final characters according to the decoder's `fatal` option.

This rule checks `TextDecoder#decode()` calls whose input comes directly from a native fetch-body stream. It reports missing streaming options or a statically falsy `stream` value. It checks both text accumulation and incremental processing.

## Examples

```js
// ❌
const response = await fetch(url);
const decoder = new TextDecoder();
let text = '';

for await (const chunk of response.body) {
	text += decoder.decode(chunk);
}
```

```js
// ✅
const response = await fetch(url);
const decoder = new TextDecoder();
let text = '';

for await (const chunk of response.body) {
	text += decoder.decode(chunk, {stream: true});
}

text += decoder.decode();
```

The same requirement applies when reading with `getReader()`:

```js
// ❌
const response = await fetch(url);
const decoder = new TextDecoder();
const reader = response.body.getReader();
let text = '';

while (true) {
	const {value, done} = await reader.read();
	if (done) {
		break;
	}

	text += decoder.decode(value);
}
```

```js
// ✅
const response = await fetch(url);
const decoder = new TextDecoder();
const reader = response.body.getReader();
let text = '';

while (true) {
	const {value, done} = await reader.read();
	if (done) {
		break;
	}

	text += decoder.decode(value, {stream: true});
}

text += decoder.decode();
```

Alternatively, use [`TextDecoderStream`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoderStream), which preserves decoder state and flushes when the input stream ends:

```js
// ✅
const response = await fetch(url);
let text = '';

for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
	text += chunk;
}
```

Preserve the original encoding and decoder options when switching to `TextDecoderStream`.

Decoding a complete buffer or an independently framed record does not need streaming:

```js
// ✅
const response = await fetch(url);
const text = new TextDecoder().decode(await response.arrayBuffer());
```

```js
// ✅ Independent records from a framing layer
const decoder = new TextDecoder();
for await (const record of records) {
	processRecord(decoder.decode(record));
}
```

## Suggestions

The rule offers an editor suggestion for simple loops that only accumulate text with `text += decoder.decode(chunk)`, and for the reader-loop shape shown above. The suggestion enables streaming and adds a consumed final flush together, or reuses an immediately following `text += decoder.decode()` flush.

Suggestions require a `const` decoder constructed outside the loop, a `let` accumulator initialized to `''`, and both declarations earlier in the same block. The decoder must only be referenced by the chunk decode and optional existing flush, and the accumulator must have no other assignments. Suggestions support omitted options, `{}`, and `{stream: false}`. Comments inside the loop or trailing its closing line prevent suggestions. Other matched calls receive a diagnostic without a suggestion.

No automatic fix is provided because enabling streaming changes decoding behavior and requires a final flush.

## Limitations

The rule follows local `const` bindings and aliases from `await fetch(...)` or `await globalThis.fetch(...)` through `.body` and `.getReader()`. It recognizes async-iteration chunks, destructured reader values including renamed bindings, and `.value` from an awaited reader result inside a loop. The chunk source and decoding call must share the nearest enclosing loop and function. Decoding an outer loop's chunk inside a nested loop is unchecked. It supports TypeScript expression wrappers and optional chaining on otherwise recognized paths.

The rule intentionally ignores arbitrary byte streams, transformed or framed streams, parameter-only provenance, callbacks, reassigned bindings, BYOB readers, computed method calls, and opaque helper returns. Response or chunk variable names and TypeScript types alone are not evidence of fetch-body provenance. Shadowed built-ins are unsupported.

Unknown option objects, spreads, accessors, explicit `__proto__` properties, unknown computed option keys, and dynamic streaming flags such as `{stream: !done}` are left unchecked.

This rule checks missing streaming at recognized chunk-decoding calls. It does not independently verify decoder reuse or final flushing in code that already enables streaming. Always keep the same decoder between chunks and consume its final flush.
