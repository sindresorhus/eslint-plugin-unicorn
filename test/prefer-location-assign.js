import test from 'node:test';
import {runInNewContext} from 'node:vm';
import outdent from 'outdent';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest({
	valid: [],
	invalid: [
		['do(location.href) = getUrl(/* keep */); while (false);', 'do location.assign(getUrl(/* keep */)); while (false);'],
		['if (ready) {} else(location.href) = getUrl(/* keep */);', 'if (ready) {} else location.assign(getUrl(/* keep */));'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

ruleTest({
	valid: [],
	invalid: [
		['location.href = getUrl(/* keep */);', 'location.assign(getUrl(/* keep */));'],
		['window./* keep */location.href = url;', 'window./* keep */location.assign(url);'],
		['location.href = (/* keep */ url);', 'location.assign((/* keep */ url));'],
		['location.href = url /* keep */;', 'location.assign(url) /* keep */;'],
		['location.href = getUrl(\r\n  // keep\r\n);', 'location.assign(getUrl(\r\n  // keep\r\n));'],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-location-assign'}]})),
});

ruleTest({
	valid: [],
	invalid: [
		{
			code: 'location.href = (url as /* keep */ string);',
			output: 'location.assign((url as /* keep */ string));',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-location-assign'}],
		},
		...[
			'(/* keep */ location).href = url;',
			'location./* keep */href = url;',
			'location.href /* keep */ = url;',
			'location["href" /* keep */] = url;',
			'const result = location.href = getUrl(/* keep */);',
			'const target = location; target.href = getUrl(/* keep */);',
			'location.href += getUrl(/* keep */);',
		].map(code => ({code, errors: [{messageId: 'prefer-location-assign'}]})),
	],
});

test('commented location assignments preserve navigation order and evaluate the URL once', t => {
	const linter = new Linter();
	for (const code of [
		'location.href = getUrl(/* keep */);',
		'window./* keep */location.href = getUrl();',
		'location.href = (/* keep */ getUrl());',
		'do(location.href) = getUrl(/* keep */); while (false);',
		'if (false) {} else(location.href) = getUrl(/* keep */);',
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn},
			rules: {'unicorn/prefer-location-assign': 'error'},
		});
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		for (const source of [code, output]) {
			const events = [];
			const location = {
				get href() {
					throw new Error('Navigation should not read href.');
				},
				set href(value) {
					events.push(['navigate', value]);
				},
				assign(value) {
					t.assert.strictEqual(this, location);
					events.push(['navigate', value]);
				},
			};
			runInNewContext(source, {
				location,
				window: {location},
				getUrl() {
					events.push('input');
					return 'https://example.com/next';
				},
			});
			t.assert.deepStrictEqual(events, ['input', ['navigate', 'https://example.com/next']]);
		}
	}
});

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
