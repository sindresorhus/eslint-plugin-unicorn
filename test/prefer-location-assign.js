import outdent from 'outdent';
import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest.snapshot({
	valid: [
		'location.href;',
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
		'let target = location; target = new URL("https://example.com"); target.href = url;',
		'let location = globalThis.location; location = new URL("https://example.com"); location.href = url;',
		'const result = location.href = url;',
		'location.href += hash;',
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
	const code = 'location.href = url;';
	const messages = linter.verify(code, unicorn.configs.recommended);
	const result = linter.verifyAndFix(code, unicorn.configs.recommended);

	t.deepEqual(
		messages.map(({message, ruleId}) => ({message, ruleId})),
		[
			{
				message: 'Prefer `Location#assign()` over assigning to `Location#href`.',
				ruleId: 'unicorn/prefer-location-assign',
			},
		],
	);
	t.true(result.fixed);
	t.is(result.output, 'location.assign(url);');
});
