import test from 'node:test';
import outdent from 'outdent';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest.snapshot({
	valid: [
		'location.href;',
		// A computed key with side effects is not treated as `href`, since the fix would drop them
		'location[(sideEffect(), "href")] = url;',
		'const url = location.href;',
		'const url = window.location.href;',
		'const url = globalThis.location.href;',
		'location.assign(url);',
		'window.location.assign(url);',
		'globalThis.location.assign(url);',
		'element.href = url;',
		'location[path] = url;',
		'location[href] = url;',
		'window.location[path] = url;',
		'delete location.href;',
		'location.href++;',
		outdent`
			const location = {};
			location.href = url;
		`,
		outdent`
			const window = {};
			window.location.href = url;
		`,
		outdent`
			const globalThis = {};
			globalThis.location.href = url;
		`,
		'let target = location; target.href = url;',
		'let target = location; target = new URL("https://example.com"); target.href = url;',
		'let location = globalThis.location; location = new URL("https://example.com"); location.href = url;',
		'const window = {}; const target = window.location; target.href = url;',
		'const globalThis = {}; const target = globalThis.location; target.href = url;',
		'const {foo} = location; foo.href = url;',
		'const [foo] = window.location; foo.href = url;',
	],
	invalid: [
		'location.href = url;',
		'window.location.href = url;',
		'globalThis.location.href = url;',
		'location["href"] = url;',
		'location[`href`] = url;',
		'const target = location; target.href = url;',
		'const target = location; target["href"] = url;',
		'const target = window.location; target.href = url;',
		'const target = globalThis.location; target.href = url;',
		'const result = location.href = url;',
		'location.href += hash;',
		'location.href = (a, b);',
		'location.href = (a, (b, c));',
		outdent`
			location.href = /* comment */ url;
		`,
		outdent`
			location.href = url /* comment */;
		`,
	],
});

test('works with the recommended config without browser globals', t => {
	const linter = new Linter({configType: 'flat'});
	const cases = [
		{
			code: 'location.href = url;',
			output: 'location.assign(url);',
		},
		{
			code: 'const target = location; target.href = url;',
			output: 'const target = location; target.href = url;',
		},
		{
			code: 'const target = window.location; target.href = url;',
			output: 'const target = globalThis.location; target.href = url;',
		},
		{
			code: 'const target = globalThis.location; target.href = url;',
			output: 'const target = globalThis.location; target.href = url;',
		},
	];

	for (const {code, output} of cases) {
		const messages = linter.verify(code, unicorn.configs.recommended);
		const result = linter.verifyAndFix(code, unicorn.configs.recommended);

		t.assert.strictEqual(
			messages.some(({ruleId}) => ruleId === 'unicorn/prefer-location-assign'),
			true,
			`Expected \`prefer-location-assign\` report for: ${code}`,
		);
		t.assert.strictEqual(result.output, output);
	}
});
