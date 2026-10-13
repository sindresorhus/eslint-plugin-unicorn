import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
