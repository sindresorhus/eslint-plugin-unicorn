import vm from 'node:vm';
import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test: testRule, rule} = getTester(import.meta);
const messageId = 'require-text-decoder-streaming/error';
const suggestionId = 'require-text-decoder-streaming/suggestion';

const forAwait = (body = 'text += decoder.decode(chunk);', before = '') => outdent`
	async function run() {
		const response = await fetch(url);
		const decoder = new TextDecoder();
		let text = '';
		${before}
		for await (const chunk of response.body) {
			${body}
		}
	}
`;

const readerLoop = (body = 'text += decoder.decode(value);') => outdent`
	async function run() {
		const response = await fetch(url);
		const decoder = new TextDecoder();
		const reader = response.body.getReader();
		let text = '';
		while (true) {
			const {value, done} = await reader.read();
			if (done) {
				break;
			}
			${body}
		}
	}
`;

testRule.snapshot({
	valid: [
		...[
			'{stream: true}',
			'{stream: 1}',
			'{stream: "yes"}',
			'{stream: false, stream: true}',
			'{stream: !done}',
			'{stream: computeFlag()}',
			'{stream}',
			'options',
			'{...options}',
			'{stream: false, ...options}',
			'{[key]: false}',
			'{get stream() { return false; }}',
			'{stream() {}}',
			'{__proto__: {stream: true}}',
			'{__proto__: options}',
			'{["__proto__"]: options}',
		].map(options => forAwait(`text += decoder.decode(chunk, ${options});`)),
		forAwait('text += decoder.decode();'),
		forAwait('text += decoder.decode(chunk, ...options);'),
		forAwait('text += decoder.decode(...chunks);'),
		forAwait('text += decoder.decode(chunk, {}, extra);'),
		forAwait('text += decoder.decode(await response.arrayBuffer());'),
		forAwait('text += decoder.decode(await response.bytes());'),
		forAwait('text += decoder.decode(frame(chunk));'),
		forAwait('text += decoder.decode(new Uint8Array([1]));'),
		forAwait().replace('response.body', 'stream'),
		forAwait().replace('response.body', 'response.body.pipeThrough(framer)'),
		forAwait().replace('response.body', 'response.body.pipeThrough(new TextDecoderStream())'),
		forAwait().replace('response.body', 'stream.values()'),
		forAwait().replace('response.body', 'response.body.pipeThrough(framer).values()'),
		forAwait().replace('response.body', 'response.body["values"]()'),
		forAwait().replace('response.body', 'response.body.values(...options)'),
		forAwait().replace('response.body', 'response.body.values({}, extra)'),
		forAwait('text += decoder.decode(chunk, {stream: true});').replace('response.body', 'response.body.values()'),
		forAwait().replace('await fetch(url)', 'new Response(stream)'),
		forAwait().replace('await fetch(url)', 'getResponse()'),
		forAwait().replace('await fetch(url)', 'fetch(url)'),
		forAwait().replace('const response', 'let response'),
		forAwait().replace('const decoder', 'let decoder'),
		forAwait().replace('const chunk', 'let chunk'),
		forAwait('function later() { return decoder.decode(chunk); }'),
		forAwait('for (const chunk of records) { text += decoder.decode(chunk); }'),
		forAwait('for (const item of items) { process(decoder.decode(chunk)); }'),
		forAwait('const chunk = record; text += decoder.decode(chunk);').replace('const chunk of', 'const bytes of'),
		forAwait('const decoder = customDecoder; text += decoder.decode(chunk);'),
		forAwait('text += customDecoder.decode(chunk);'),
		forAwait('const alias = chunk; alias = record; text += decoder.decode(alias);'),
		forAwait('chunk = record; text += decoder.decode(chunk);'),
		forAwait('text += decoder[method](chunk);'),
		forAwait('text += decoder["decode"](chunk);'),
		forAwait('text += decoder.decode(chunk, {stream: flag});', 'let flag = false;'),
		forAwait('text += decoder.decode(chunk, {stream: state.flag});', 'const state = {flag: false}; state.flag = true;'),
		readerLoop().replace('response.body.getReader()', 'stream.getReader()'),
		readerLoop().replace('response.body.getReader()', 'response.body.getReader({mode: "byob"})'),
		readerLoop().replace('const {value, done}', 'let {value, done}'),
		readerLoop('value = record; text += decoder.decode(value);'),
		readerLoop('const {value} = await otherReader.read(); text += decoder.decode(value);').replace('const {value, done}', 'const {value: bytes, done}'),
		readerLoop('{ const result = record; text += decoder.decode(result.value); }')
			.replace('const {value, done} = await reader.read();', 'const result = await reader.read();')
			.replace('if (done)', 'if (result.done)'),
		outdent`
			async function run(response) {
				const decoder = new TextDecoder();
				for await (const chunk of response.body) {
					decoder.decode(chunk);
				}
			}
		`,
		outdent`
			async function run() {
				const response = await fetch(url);
				const reader = response.body.getReader();
				const {value} = await reader.read();
				const decoder = new TextDecoder();
				while (condition) {
					decoder.decode(value);
				}
			}
		`,
		forAwait('const first = second; const second = first; text += decoder.decode(first);'),
		outdent`
			async function run() {
				const response = await fetch(url);
				const decoder = new TextDecoder();
				{
					const response = getResponse();
					for await (const chunk of response.body) {
						decoder.decode(chunk);
					}
				}
			}
		`,
		{code: forAwait().replace('await fetch(url)', 'getResponse() as Response'), languageOptions: {parser: parsers.typescript}},
		'new TextDecoder().decode(chunk);',
		forAwait().replace('await fetch(url)', 'await getResponse(url)'),
		readerLoop().replace('await reader.read()', 'await reader.peek()'),
	],
	invalid: [
		forAwait(),
		readerLoop(),
		...[
			'{}',
			'{other: value}',
			'{stream: false}',
			'{stream: 0}',
			'{stream: ""}',
			'{stream: undefined}',
			'{stream: null}',
			'{stream: true, stream: false}',
			'{["stream"]: false}',
			'undefined',
			'null',
			'void 0',
		].map(options => forAwait(`text += decoder.decode(chunk, ${options});`)),
		forAwait('text += decoder.decode(chunk, {stream: flag});', 'const flag = false;'),
		forAwait('parse(decoder.decode(chunk));'),
		forAwait('text += new TextDecoder().decode(chunk);'),
		forAwait('const decoder = new TextDecoder(); text += decoder.decode(chunk);'),
		forAwait('const bytes = chunk; text += decoder.decode(bytes);'),
		forAwait('text += decoder.decode(chunk); text += decoder.decode(chunk);'),
		forAwait('text += (decoder).decode((chunk));'),
		forAwait('text += decoder?.decode?.(chunk);'),
		forAwait().replace('await fetch(url)', 'await globalThis.fetch(url)'),
		forAwait().replace('await fetch(url)', '(await fetch(url))'),
		forAwait().replace('response.body', '(await fetch(url)).body'),
		forAwait().replace('response.body', 'body').replace('let text', 'const body = response.body; let text'),
		forAwait().replace('const decoder = new TextDecoder();', 'const original = new TextDecoder(); const decoder = original;'),
		readerLoop().replace('const reader = response.body.getReader();', 'const body = response.body; const original = body.getReader(); const reader = original;'),
		readerLoop()
			.replace('{value, done}', '{value: chunk, done: finished}')
			.replace('if (done)', 'if (finished)')
			.replace('decode(value)', 'decode(chunk)'),
		readerLoop()
			.replace('const {value, done} = await reader.read();', 'const result = await reader.read();')
			.replace('if (done)', 'if (result.done)')
			.replace('decode(value)', 'decode(result.value)'),
		readerLoop('text += decoder.decode((await reader.read()).value);'),
		readerLoop().replace('response.body.getReader()', 'response.body?.getReader()').replace('await reader.read()', 'await reader?.read?.()'),
		readerLoop().replace('while (true)', 'do').replace('\n\t}\n}', '\n\t} while (condition);\n}'),
		readerLoop().replace('while (true)', 'for (;;)'),
		forAwait('text += decoder.decode(chunk,);'),
		forAwait('text += decoder.decode(chunk, {stream: false,});'),
		forAwait('text += decoder.decode(/* bytes */ chunk);'),
		forAwait('text += decoder.decode(chunk, {/* mode */ stream: false});'),
		forAwait().replace('\n\t}\n}', '\n\t} // Keep this comment\n}'),
		forAwait().replaceAll('\t', '  '),
		forAwait().replaceAll('\n', '\r\n'),
		...[
			forAwait('text += (decoder as TextDecoder).decode(chunk as Uint8Array);'),
			forAwait('text += decoder!.decode(chunk!);').replace('response.body', 'response.body!'),
			forAwait('text += decoder.decode(chunk satisfies Uint8Array, {stream: false} satisfies TextDecodeOptions);'),
			forAwait('text += (<TextDecoder>decoder).decode(<Uint8Array>chunk);'),
			readerLoop().replace('await reader.read()', '(await reader.read()) as ReadableStreamReadResult<Uint8Array>'),
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
		// Not a simple loop, so no suggestion
		readerLoop().replace('break;\n\t\t}', 'break;\n\t\t} else {\n\t\t\tcontinue;\n\t\t}'),
		readerLoop().replace('break;', 'cleanup();\n\t\t\tbreak;'),
		forAwait().replace('{\n\t\ttext += decoder.decode(chunk);\n\t}', 'text += decoder.decode(chunk);'),
	],
});

const suggestionOutput = code => code
	.replace('decoder.decode(chunk)', 'decoder.decode(chunk, {stream: true})')
	.replace('decoder.decode(value)', 'decoder.decode(value, {stream: true})')
	.replace('\n\t}\n}', '\n\t}\n\ttext += decoder.decode();\n}');

testRule.typescript({
	valid: [
		forAwait('text += decoder.decode!(chunk, {stream: true});'),
		forAwait().replace('fetch(url)', '(client as typeof globalThis).fetch(url)'),
	],
	invalid: [
		...[
			forAwait('text += decoder.decode!(chunk);'),
			forAwait('text += (decoder.decode as TextDecoder["decode"])(chunk);'),
			forAwait('text += new (TextDecoder as typeof TextDecoder)().decode(chunk);'),
		].map(code => ({code, errors: [{messageId, suggestions: []}]})),
		...[
			forAwait().replace('fetch(url)', 'fetch!(url)').replace('new TextDecoder()', 'new (TextDecoder!)()'),
			forAwait().replace('fetch(url)', 'globalThis.fetch!(url)'),
			forAwait().replace('fetch(url)', 'globalThis!.fetch(url)'),
			forAwait().replace('fetch(url)', '(globalThis as typeof globalThis).fetch(url)'),
			forAwait().replace('response.body', 'response.body!.values!()'),
			readerLoop().replace('getReader()', 'getReader!()').replace('reader.read()', 'reader.read!()'),
		].map(code => ({
			code,
			errors: [{messageId, suggestions: [{messageId: suggestionId, output: suggestionOutput(code)}]}],
		})),
	],
});

testRule({
	valid: [],
	invalid: [
		{
			code: forAwait('text += (decoder).decode((chunk), ({}));').replaceAll(';', ''),
			errors: [{
				messageId, suggestions: [{
					messageId: suggestionId,
					output: forAwait('text += (decoder).decode((chunk), ({stream: true}));')
						.replaceAll(';', '')
						.replace('\n\t}\n}', '\n\t}\n\ttext += decoder.decode();\n}'),
				}],
			}],
		},
		...[
			forAwait(),
			readerLoop(),
			forAwait().replace('const decoder', 'const alias = response; const decoder').replace('response.body', 'alias.body'),
			forAwait().replace('response.body', 'response.body.values()'),
			forAwait().replace('response.body', 'response.body.values({preventCancel: true})'),
			forAwait('text += decoder.decode(chunk);', 'const chunks = response.body.values();').replace('const chunk of response.body', 'const chunk of chunks'),
		].map(code => ({
			code,
			errors: [{messageId, suggestions: [{messageId: suggestionId, output: suggestionOutput(code)}]}],
		})),
		{
			code: outdent`
				const response = await fetch(url);
				const decoder = new TextDecoder();
				let text = '';
				for await (const chunk of response.body) {
					text += decoder.decode(chunk);
				}
			`,
			errors: [{
				messageId, suggestions: [{
					messageId: suggestionId,
					output: outdent`
						const response = await fetch(url);
						const decoder = new TextDecoder();
						let text = '';
						for await (const chunk of response.body) {
							text += decoder.decode(chunk, {stream: true});
						}
						text += decoder.decode();
					`,
				}],
			}],
		},
		{
			code: forAwait().replace('\n\t}\n}', '\n\t}\n\ttext += decoder.decode();\n}'),
			errors: [{messageId, suggestions: [{messageId: suggestionId, output: suggestionOutput(forAwait())}]}],
		},
		...[
			forAwait('parse(decoder.decode(chunk));'),
			forAwait('text += new TextDecoder().decode(chunk);'),
			forAwait('const decoder = new TextDecoder(); text += decoder.decode(chunk);'),
			forAwait('text += decoder?.decode(chunk);'),
			forAwait('text += decoder.decode(chunk, null);'),
			forAwait('text += decoder.decode(chunk, {stream: 0});'),
			forAwait('text += decoder.decode(chunk, {stream: false, other: value});'),
			forAwait('text += decoder.decode(chunk, {other: false});'),
			forAwait('text += decoder.decode(chunk, {other: computeFlag()});'),
			readerLoop('text += decoder.decode((await reader.read()).value);'),
			readerLoop('text += decoder.decode(bytes);')
				.replace('const {value, done} = await reader.read();', 'const result = await reader.read(); const alias = result; const {value: bytes, done} = alias;'),
			forAwait('text += decoder.decode((await reader.read()).value);', 'const reader = response.body.getReader();')
				.replace('const chunk of response.body', 'const trigger of events'),
			forAwait('text += decoder.decode(/* comment */ chunk);'),
			forAwait('text += decoder.decode(chunk);', 'consume(decoder);'),
			forAwait('text += decoder.decode(chunk);', 'text = prefix;'),
			forAwait('text += decoder.decode(chunk);', 'function reset() { text = ""; }'),
			forAwait('text += decoder.decode(chunk);', 'let otherText = "";')
				.replace('\n\t}\n}', '\n\t}\n\totherText += decoder.decode();\n}'),
			forAwait().replace('\n\t}\n}', '\n\t}\n\tdecoder.decode();\n}'),
			forAwait().replace('\n\t}\n}', '\n\t} // Comment\n}'),
			forAwait().replace('let text = \'\';', 'let text = getText();'),
			readerLoop().replace('break;', 'return;'),
			readerLoop().replace('if (done)', 'if (condition)'),
		].map(code => ({code, errors: [{messageId, suggestions: []}]})),
	],
});

const linter = new Linter();
const config = {
	plugins: {unicorn: {rules: {'require-text-decoder-streaming': rule}}},
	rules: {'unicorn/require-text-decoder-streaming': 'error'},
};

function createResponse(bytes) {
	return new Response(new ReadableStream({
		start(controller) {
			for (const byte of bytes) {
				controller.enqueue(Uint8Array.of(byte));
			}

			controller.close();
		},
	}));
}

for (const [name, code] of [
	['async iteration', forAwait()],
	['explicit iterator', forAwait().replace('response.body', 'response.body.values({preventCancel: true})')],
	['reader loop', readerLoop()],
]) {
	test(`${name}: the suggested code preserves split characters and flushes`, async t => {
		const [problem] = linter.verify(code, config);
		t.assert.strictEqual(problem.messageId, messageId);
		const [{fix}] = problem.suggestions;
		const fixed = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.deepStrictEqual(linter.verify(fixed, config), []);
		const original = code.replace('\n}', '\nreturn text;\n}') + '\nrun();';
		const encoder = new TextEncoder();
		const broken = await vm.runInNewContext(original, {fetch: () => createResponse(encoder.encode('€')), url: 'url', TextDecoder});
		t.assert.strictEqual(broken, '���');
		const executable = fixed.replace('\n}', '\nreturn text;\n}') + '\nrun();';
		await Promise.all(['€', '😀', 'a€😀z', ''].map(async text => {
			const result = await vm.runInNewContext(executable, {fetch: () => createResponse(encoder.encode(text)), url: 'url', TextDecoder});
			t.assert.strictEqual(result, text);
		}));
		const utf16Code = executable.replace('new TextDecoder()', 'new TextDecoder("utf-16le")');
		const utf16 = await vm.runInNewContext(utf16Code, {fetch: () => createResponse([0xAC, 0x20]), url: 'url', TextDecoder});
		t.assert.strictEqual(utf16, '€');
		const result = await vm.runInNewContext(executable, {fetch: () => createResponse([0xE2]), url: 'url', TextDecoder});
		t.assert.strictEqual(result, '�');
		const fatalCode = executable.replace('new TextDecoder()', 'new TextDecoder("utf-8", {fatal: true})');
		await t.assert.rejects(vm.runInNewContext(fatalCode, {fetch: () => createResponse([0xE2]), url: 'url', TextDecoder}), TypeError);
	});
}
