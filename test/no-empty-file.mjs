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
		...[
			'// comment',
			'/* comment */',
			'/// comment',
			'/* comment */ {}',
			outdent`
				/*
					comment
				*/
			`,
			outdent`
				/*
					comment
				*/
				console.log('done');
			`,
		].map(code => ({code, filename: 'example.js', options: [{allow: ['comments']}]})),
		'',
		...[
			'md',
			'vue',
			'svelte',
		].map(extension => ({code: '', filename: `example.${extension}`})),
		...[
			'd.ts',
			'ts',
		].map(extension => ({code: '/// <reference types="example" />', filename: `example.${extension}`})),
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
			'cJs',
			'ts',
			'tsx',
			'jsx',
			'MTS',
			'cts',
		].map(extension => ({code: '{}', filename: `example.${extension}`})),
	],
});

// Test for https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2175
test.typescript({
	valid: [
		{code: '(() => {})();', filename: 'example.ts'},
	],
	invalid: [
		{code: '"";', filename: 'example.ts', errors: 1},
		{code: '"use strict";', filename: 'example.ts', errors: 1},
	],
});
