import outdent from 'outdent';
import {getTester} from './utils/test.js';

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
	],
});
