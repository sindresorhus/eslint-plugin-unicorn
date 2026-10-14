import {Buffer} from 'node:buffer';
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

const linterConfig = {
	plugins: {unicorn: {rules: {'no-new-buffer': rule}}},
	rules: {'unicorn/no-new-buffer': 'error'},
};

const getSuggestions = (t, code, messageId = 'error-unknown') => {
	const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].messageId, messageId);
	t.assert.strictEqual(messages[0].fix, undefined);
	return messages[0].suggestions.map(({desc, fix: {range, text}}) => ({
		method: desc.includes('alloc') ? 'alloc' : 'from',
		code: code.slice(0, range[0]) + text + code.slice(range[1]),
	}));
};

nodeTest('code point Buffer inputs preserve construction after numeric inference becomes conservative', t => {
	const code = 'new Buffer("a".codePointAt(0), 0).length;';
	t.assert.strictEqual(runInNewContext(code, {Buffer}), 97);
	const suggestions = getSuggestions(t, code);
	t.assert.deepStrictEqual(suggestions.map(({method}) => method), ['from', 'alloc']);
	t.assert.strictEqual(runInNewContext(suggestions[1].code, {Buffer}), 97);
});

nodeTest('unknown numeric Buffer inputs require choosing the allocation suggestion', t => {
	for (const [argument, extras, length] of [
		['0', '0', 0],
		['3', '0', 3],
		['3', '65, "utf8"', 3],
		['Number("4")', '0', 4],
		['"a".codePointAt(0)', '0', 97],
	]) {
		const code = `function create(input) { return new Buffer(input, ${extras}).length; } create(${argument});`;
		t.assert.strictEqual(runInNewContext(code, {Buffer}), length);
		const suggestions = getSuggestions(t, code);
		t.assert.deepStrictEqual(suggestions.map(({method}) => method), ['from', 'alloc']);
		t.assert.throws(() => runInNewContext(suggestions[0].code, {Buffer}), {name: 'TypeError'});
		t.assert.strictEqual(runInNewContext(suggestions[1].code, {Buffer}), length);
	}
});

nodeTest('unknown array and ArrayBuffer inputs can use the from suggestion', t => {
	for (const [argument, extras, expected] of [
		['[1, 2, 3]', '0', [1, 2, 3]],
		['new Uint8Array([1, 2, 3]).buffer', '1, 1', [2]],
	]) {
		const code = `function create(input) { return [...new Buffer(input, ${extras})]; } JSON.stringify(create(${argument}));`;
		t.assert.strictEqual(runInNewContext(code, {Buffer}), JSON.stringify(expected));
		const suggestions = getSuggestions(t, code);
		t.assert.deepStrictEqual(suggestions.map(({method}) => method), ['from', 'alloc']);
		t.assert.strictEqual(runInNewContext(suggestions[0].code, {Buffer}), JSON.stringify(expected));
		t.assert.throws(() => runInNewContext(suggestions[1].code, {Buffer}), {name: 'TypeError'});
	}
});

nodeTest('allocation suggestions preserve comments and ignored-argument side effects', t => {
	for (const extras of ['/* keep */ 0', '0 /* keep */', '0, /* keep */ "hex"', 'getFill()']) {
		const code = outdent`
			const calls = [];
			function getFill() { calls.push("fill"); return 65; }
			function create(input) { return new Buffer(input, ${extras}).length; }
			JSON.stringify({length: create(3), calls});
		`;
		const suggestions = getSuggestions(t, code);
		t.assert.deepStrictEqual(suggestions.map(({method}) => method), ['from']);
		if (extras.includes('keep')) {
			t.assert.ok(suggestions[0].code.includes('/* keep */'));
		}

		t.assert.strictEqual(runInNewContext(code, {Buffer}), JSON.stringify({length: 3, calls: extras === 'getFill()' ? ['fill'] : []}));
	}
});

nodeTest('known Buffer inputs retain safe autofixes and ignored-argument guards', t => {
	for (const [code, expected] of [
		['new Buffer(0).length;', 0],
		['new Buffer(3).length;', 3],
		['const size = 3; new Buffer(size).length;', 3],
		['new Buffer(Number("3")).length;', 3],
		['new Buffer("6162", "hex").toString();', 'ab'],
		['const value = "6162"; new Buffer(value, "hex").toString();', 'ab'],
		['function create(input) { return new Buffer(input, "hex").toString(); } create("6162");', 'ab'],
		['function create(input) { try { new Buffer(input, "hex"); } catch (error) { return error.code; } } create(3);', 'ERR_INVALID_ARG_TYPE'],
		['JSON.stringify([...new Buffer([1, 2, 3], 0)]);', '[1,2,3]'],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(runInNewContext(code, {Buffer}), expected);
		t.assert.strictEqual(runInNewContext(output, {Buffer}), expected);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
	}

	for (const extras of ['/* keep */ 65', 'getFill()']) {
		const code = `function getFill() { return 65; } new Buffer(3, ${extras}).length;`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(messages[0].messageId, 'error');
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(runInNewContext(output, {Buffer}), 3);
	}
});

nodeTest('numeric Buffer suggestions discard literal fill bytes rather than passing them to alloc', t => {
	for (const [size, extras, expected] of [
		['0', '65', []],
		['3', '0xff', [0, 0, 0]],
		['3', '65, "utf8"', [0, 0, 0]],
		['Number("3")', '65', [0, 0, 0]],
	]) {
		const code = `JSON.stringify([...new Buffer(${size}, ${extras})]);`;
		const suggestions = getSuggestions(t, code, 'error');
		t.assert.deepStrictEqual(suggestions.map(({method}) => method), ['alloc']);
		t.assert.strictEqual(runInNewContext(code, {Buffer}), JSON.stringify(expected));
		t.assert.strictEqual(runInNewContext(suggestions[0].code, {Buffer}), JSON.stringify(expected));
	}
});

nodeTest('numeric Buffer suggestions expose the loss of encoding errors', t => {
	const code = outdent`
		const size = 3;
		const encoding = "utf8";
		let failure;
		try { new Buffer(size, encoding); } catch (error) { failure = error.name; }
		failure;
	`;
	const suggestions = getSuggestions(t, code, 'error');
	t.assert.strictEqual(suggestions.length, 1);
	t.assert.strictEqual(runInNewContext(code, {Buffer}), 'TypeError');
	t.assert.strictEqual(runInNewContext(suggestions[0].code, {Buffer}), undefined);
});

nodeTest('numeric Buffer suggestions expose dropped tagged calls and generator consumption', t => {
	for (const [setup, argument, originalCalls] of [
		['function fill() { calls.push("fill"); return 65; }', 'fill`value`', ['fill']],
		[
			'function* values() { calls.push("start"); yield 65; calls.push("middle"); yield "utf8"; calls.push("end"); } const extras = values();',
			'...extras',
			['start', 'middle', 'end'],
		],
	]) {
		const code = outdent`
			const calls = [];
			${setup}
			const length = new Buffer(3, ${argument}).length;
			JSON.stringify({length, calls});
		`;
		const suggestions = getSuggestions(t, code, 'error');
		t.assert.strictEqual(suggestions.length, 1);
		t.assert.strictEqual(runInNewContext(code, {Buffer}), JSON.stringify({length: 3, calls: originalCalls}));
		t.assert.strictEqual(runInNewContext(suggestions[0].code, {Buffer}), '{"length":3,"calls":[]}');
	}
});

nodeTest('numeric Buffer suggestions expose discarded spread errors', t => {
	const code = outdent`
		function* values() { yield 65; throw new RangeError("extra"); }
		const extras = values();
		let failure;
		try { new Buffer(3, ...extras); } catch (error) { failure = error.name; }
		failure;
	`;
	const suggestions = getSuggestions(t, code, 'error');
	t.assert.strictEqual(suggestions.length, 1);
	t.assert.strictEqual(runInNewContext(code, {Buffer}), 'RangeError');
	t.assert.strictEqual(runInNewContext(suggestions[0].code, {Buffer}), undefined);
});

nodeTest('zero arguments retain their existing conversion and error', t => {
	const code = 'let failure; try { new Buffer(); } catch (error) { failure = error.name; } failure;';
	const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
	t.assert.strictEqual(runInNewContext(code, {Buffer}), 'TypeError');
	t.assert.strictEqual(runInNewContext(output, {Buffer}), 'TypeError');
});

test.snapshot({
	valid: [
		'const buffer = Buffer',
		'const buffer = new NotBuffer(1)',
		'const buffer = Buffer.from(\'buf\')',
		'const buffer = Buffer.from(\'7468697320697320612074c3a97374\', \'hex\')',
		'const buffer = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])',
		'const buffer = Buffer.alloc(10)',
	],
	invalid: [
		outdent`
			const modes = new Set(['foo']);
			modes.clear();
			new Buffer(modes.size ? 'x' : 1);
		`,
		'const modes = new Set(["foo"]); modes.clear(); new Buffer((modes.size && "x") || value);',
		'const alias = condition; var condition = true; new Buffer(alias ? "x" : 1);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); new Buffer(object.value ? "x" : value);',
		{
			code: 'const modes = new Set(["foo"]); modes.clear(); new Buffer((modes.size ? 1 : "x") as string);',
			languageOptions: {parser: parsers.typescript},
		},
		// `new Buffer(array)`
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_array
		'const buffer = new Buffer([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])',
		'const buffer = new Buffer([0x62, bar])',
		outdent`
			const array = [0x62];
			const buffer = new Buffer(array);
		`,

		// `new Buffer(arrayBuffer[, byteOffset[, length]])`
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_arraybuffer_byteoffset_length
		outdent`
			const arrayBuffer = new ArrayBuffer(10);
			const buffer = new Buffer(arrayBuffer);
		`,
		outdent`
			const arrayBuffer = new ArrayBuffer(10);
			const buffer = new Buffer(arrayBuffer, 0, );
		`,
		outdent`
			const arrayBuffer = new ArrayBuffer(10);
			const buffer = new Buffer(arrayBuffer, 0, 2);
		`,

		// `new Buffer(size)`
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_size
		'const buffer = new Buffer(10);',
		outdent`
			const size = 10;
			const buffer = new Buffer(size);
		`,
		'new Buffer(foo.length)',
		'new Buffer(Math.min(foo, bar))',

		// `new Buffer(string[, encoding])`
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_string_encoding
		'const buffer = new Buffer("string");',
		'const buffer = new Buffer("7468697320697320612074c3a97374", "hex")',
		outdent`
			const string = "string";
			const buffer = new Buffer(string);
		`,
		// eslint-disable-next-line no-template-curly-in-string
		'const buffer = new Buffer(`${unknown}`)',

		// Unknown
		'const buffer = new (Buffer)(unknown)',
		'const buffer = new Buffer(unknown, 2)',
		// A string encoding throws for a numeric input in both forms
		'const buffer = new Buffer(unknown, "base64")',
		'const encoding = "hex"; const buffer = new Buffer(unknown, encoding)',
		'const buffer = new Buffer(...unknown)',

		// `ReturnStatement`
		outdent`
			() => {
				return new // 1
					Buffer();
			}
		`,
		outdent`
			() => {
				return (
					new // 2
						Buffer()
				);
			}
		`,
		outdent`
			() => {
				return new // 3
					(Buffer);
			}
		`,
		outdent`
			() => {
				return new // 4
					Buffer;
			}
		`,
		outdent`
			() => {
				return (
					new // 5
						Buffer
				);
			}
		`,
		outdent`
			() => {
				return (
					new // 6
						(Buffer)
				);
			}
		`,

		// The numeric constructor does not use these extra arguments as fill bytes
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_size
		'const buffer = new Buffer(10, 0);',
		outdent`
			const size = 10;
			const buffer = new Buffer(size, 0);
		`,
		'const buffer = new Buffer(10, 0, "hex");',
		{
			code: 'const buffer = new Buffer(size, fill);',
			languageOptions: {parser: parsers.typescript},
		},
		'const buffer = new Buffer(10, 0x62);',
		'const buffer = new Buffer(10, 0x62, "hex");',
		'const buffer = new Buffer(10, fill);',
		'const buffer = new Buffer(10, 65, "utf8");',

		// Misc
		'const buffer = new /* comment */ Buffer()',
		'const buffer = new /* comment */ Buffer',

		// Dropping an extra argument must not move a comment onto the size, or drop a side effect
		'const buffer = new Buffer(10, /* fill byte */ 0xff);',
		outdent`
			const buffer = new Buffer(10, // fill byte
				0xff);
		`,
		'const buffer = new Buffer(10, 0xff /* fill byte */);',
		'const buffer = new Buffer(10, 0xff, /* encoding */ "hex");',
		'const buffer = new Buffer(10 /* size */, 0xff);',
		'const buffer = new Buffer(10, getFill());',
		'const buffer = new Buffer((10), (0));',
	],
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: 'new Buffer(input, encoding);',
			errors: [{
				messageId: 'error-unknown',
				suggestions: [
					{messageId: 'suggestion', output: 'Buffer.from(input, encoding);'},
					{messageId: 'suggestion', output: 'Buffer.alloc(input);'},
				],
			}],
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'function create(input) { return new (Buffer)(input, 0, "hex"); }',
		'const result = (new Buffer(input, (0))).length;',
		'new /* keep */ Buffer(input, 0);',
		'new Buffer(/* input */ input, 0);',
		'new Buffer(input, /* fill */ 0);',
		'new Buffer(input, 0, getEncoding());',
		'new Buffer(input, 0, ...extras);',
		'function create(input) {\r\n  return new Buffer(input, 0);\r\n}',
		'function create(input) {\n  return new // keep\n    Buffer(input, 0);\n}',
		{
			code: 'function create(input: number | string) { return new Buffer(input, 0); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Buffer((input as number | string), 0);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Buffer(input!, 0);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Buffer(input satisfies string, 0);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function create(size: number) { return new Buffer(size, 65); }',
			languageOptions: {parser: parsers.typescript},
		},
		'const result = new Buffer((3 /* size */), (65));',
		'function create() {\r\n  return new Buffer(3, 65);\r\n}',
		{
			code: 'new Buffer((size as number), 65);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function create(size: number) { return new Buffer(size!, 65); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Buffer(size satisfies number, 65);',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
