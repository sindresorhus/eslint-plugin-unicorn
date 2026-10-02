# require-text-decoder-streaming

📝 Require streaming decoding of fetch-body chunks with `TextDecoder`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- The examples use UTF-8; the rule also checks other encodings. -->

Fetch-body chunks can split a multibyte character. Decoding each chunk independently can turn `€` into `���`.

The [Encoding Standard](https://encoding.spec.whatwg.org/#interface-textdecoder) describes incremental decoding with the same `TextDecoder` instance: pass `{stream: true}` for each chunk, then consume the result of a final `decoder.decode()` call. The final call flushes any buffered bytes and handles incomplete final characters according to the decoder's `fatal` option.

This rule reports missing streaming options or statically falsy `stream` values when decoding native fetch-body chunks, including incremental processing. It does not independently verify decoder reuse or final flushing.

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

The same requirement applies when iterating with `response.body.values()` (including `.values({preventCancel: true})`) or reading with `getReader()`:

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

Suggestions enable streaming and consume the final flush for the simple accumulation loops shown above. More complex code or comments may prevent suggestions. No autofix is provided.

## Limitations

Detection requires native fetch-body provenance within the same function and nearest loop, following only local `const` bindings and aliases. Arbitrary or transformed streams and unknown option objects or `stream` values are unchecked. Names and types alone do not establish provenance.
