import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test.snapshot({
	valid: [
		'Response.json(data)',
		'Response(JSON.stringify(data))',
		'new Response()',
		'new NotResponse(JSON.stringify(data))',
		'new Response(JSON.stringify(...data))',
		'new Response(JSON.stringify())',
		'new Response(JSON.stringify(data, extraArgument))',
		'new Response(JSON.stringify?.(data))',
		'new Response(JSON?.stringify(data))',
		'new Response(new JSON.stringify(data))',
		'new Response(JSON.not_stringify(data))',
		'new Response(NOT_JSON.stringify(data))',
		'new Response(data(JSON.stringify))',
		'new Response("" + JSON.stringify(data))',
	],
	invalid: [
		'new Response(JSON.stringify(data))',
		'new Response(JSON.stringify(data), extraArgument)',
		'new Response( (( JSON.stringify( (( 0, data )), ) )), )',
		outdent`
			function foo() {
				return new // comment
					Response(JSON.stringify(data))
			}
		`,
		'new Response(JSON.stringify(data), {status: 200})',
		outdent`
			foo
			new (( Response ))(JSON.stringify(data))
		`,
		outdent`
			foo;
			new (( Response ))(JSON.stringify(data))
		`,
		outdent`
			foo;
			(( new (( Response ))(JSON.stringify(data)) ))
		`,
		outdent`
			foo
			(( new (( Response ))(JSON.stringify(data)) ))
		`,
		// A comment in the removed part of `JSON.stringify()` is preserved by not fixing
		'new Response(JSON.stringify(/* keep */ foo));',
		'new Response(JSON.stringify(foo /* keep */));',
		'new Response( ( /* keep */ ( JSON.stringify( (( 0, foo )), ) ) ) );',
		// A comment inside the data argument is kept
		'new Response(JSON.stringify({a: 1 /* keep */}));',
	],
});

test({
	valid: [],
	invalid: [
		// `JSON.stringify()` returns `undefined` for these, which `Response.json()` rejects instead of creating a body
		{
			code: 'new Response(JSON.stringify(undefined));',
			errors: 1,
		},
		{
			code: 'new Response(JSON.stringify(void 0));',
			errors: 1,
		},
		{
			code: 'new Response(JSON.stringify(() => {}));',
			errors: 1,
		},
		{
			code: 'new Response(JSON.stringify(function () {}));',
			errors: 1,
		},
		{
			code: 'new Response(JSON.stringify(class {}));',
			errors: 1,
		},
		{
			code: 'new Response(JSON.stringify((undefined as unknown)!));',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		// `JSON.stringify(null)` is `'null'`, which `Response.json(null)` also creates
		{
			code: 'new Response(JSON.stringify(null));',
			output: 'Response.json(null);',
			errors: 1,
		},
		{
			code: 'new Response(JSON.stringify({value: 1} as const));',
			languageOptions: {parser: parsers.typescript},
			output: 'Response.json({value: 1} as const);',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'function create() {return new // keep\nResponse(JSON.stringify({})).ok}',
			output: 'function create() {return (// keep\nResponse.json({})).ok}',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		{code: 'new new Response(JSON.stringify({value: 1})).constructor("text");', output: 'new (Response.json({value: 1})).constructor("text");', errors: 1},
		{code: 'new (new Response(JSON.stringify({value: 1}))).constructor("text");', output: 'new (Response.json({value: 1})).constructor("text");', errors: 1},
		{code: 'new new // keep\nResponse(JSON.stringify({value: 1})).constructor("text");', output: 'new (// keep\nResponse.json({value: 1})).constructor("text");', errors: 1},
	],
});

nodeTest('Response call conversions preserve constructor receivers', async t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: {rules: {'prefer-response-static-json': rule}}}, rules: {'unicorn/prefer-response-static-json': 'error'}};
	await Promise.all(['new new Response(JSON.stringify({value: 1})).constructor("text");', 'new (new Response(JSON.stringify({value: 1}))).constructor("text");'].map(async code => {
		const {output, messages, fixed} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		const original = runInNewContext(code, {Response});
		const actual = runInNewContext(output, {Response});
		t.assert.strictEqual(actual.constructor, Response);
		t.assert.strictEqual(await actual.text(), await original.text());
	}));
});
