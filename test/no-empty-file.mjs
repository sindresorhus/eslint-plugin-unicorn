import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		...[
			'const x = 0;',
			';; const x = 0;',
			'{{{;;const x = 0;}}}',
			outdent`
				'use strict';
				const x = 0;
			`,
			';;\'use strict\';',
			'{\'use strict\';}',
			'("use strict")',
			'`use strict`',
			'({})',
			outdent`
				#!/usr/bin/env node
				console.log('done');
			`,
			'false',
			'("")',
			'NaN',
			'undefined',
			'null',
			'[]',
			'(() => {})()',
		].map(code => ({code, filename: 'example.js'})),
		'',
		...[
			'md',
			'vue',
			'svelte',
			'tsx',
		].map(extension => ({code: '', filename: `example.${extension}`})),
		{code: '/// <reference types="unicorn" />', filename: 'example.d.ts'},
	],
	invalid: [
		...[
			'',
			'\uFEFF',
			' ',
			'\t',
			'\n',
			'\r',
			'\r\n',
			outdent`

			`,
			'// comment',
			'/* comment */',
			'#!/usr/bin/env node',
			'\'use asm\';',
			'\'use strict\';',
			'"use strict"',
			'""',
			';',
			';;',
			'{}',
			'{;;}',
			'{{}}',
		].map(code => ({code, filename: 'example.js'})),
		...[
			'mjs',
			'cjs',
			'ts',
			'mts',
			'cts',
		].map(extension => ({code: '{}', filename: `example.${extension}`})),
	],
});
