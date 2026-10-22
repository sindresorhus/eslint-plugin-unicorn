import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['check(/* keep */) ? (inner ? value : fallback) : fallback;', 'check(/* keep */) && inner ? value : fallback;'],
		['outer ? (inner(/* keep */) ? value : fallback) : fallback;', 'outer && inner(/* keep */) ? value : fallback;'],
		['outer ? (inner ? value(/* keep */) : fallback) : fallback;', 'outer && inner ? value(/* keep */) : fallback;'],
		['outer ? value : (inner ? value : fallback(/* keep */));', 'outer || inner ? value : fallback(/* keep */);'],
		['check(// keep\r\n) ? (inner ? value : fallback) : fallback;', 'check(// keep\r\n) && inner ? value : fallback;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'outer ? (inner ? (value as /* keep */ string) : fallback) : fallback;',
			output: 'outer && inner ? (value as /* keep */ string) : fallback;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			'outer ? value(/* keep */) : (inner ? value(/* keep */) : fallback);',
			'outer ? (inner ? value : fallback(/* keep */)) : fallback(/* keep */);',
			'outer ? /* keep */ (inner ? value : fallback) : fallback;',
		].map(code => ({code, errors: 1})),
	],
});

nodeTest('comment-preserving ternary fixes retain short-circuit evaluation', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-unnecessary-nested-ternary': rule}}},
		rules: {'unicorn/no-unnecessary-nested-ternary': 'error'},
	};
	for (const expression of [
		'read(/* keep */ "outer", outer) ? (read("inner", inner) ? read("value", 1) : read("fallback", 2)) : read("fallback", 2)',
		'read(/* keep */ "outer", outer) ? read("value", 1) : (read("inner", inner) ? read("value", 1) : read("fallback", 2))',
	]) {
		const code = `const seen = []; const read = (name, value) => { seen.push(name); return value; }; const result = ${expression}; JSON.stringify({seen, result});`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		for (const outer of [false, 0, '', true, 'value']) {
			for (const inner of [false, 0, '', true, 'value']) {
				t.assert.strictEqual(runInNewContext(output, {outer, inner}), runInNewContext(code, {outer, inner}));
			}
		}
	}
});

test({
	valid: [
		'a ? b : c;',
		'a ? (b ? c : d) : e;',
		'a ? e : (b ? c : d);',
		'a ? (b ? d : c) : d;',
		'a ? c : (b ? d : c);',
		'a ? (b ? c : d) : (b ? c : d);',
		'foo ? (bar ? baz : object?.property) : object.property;',
		'foo ? object.property : (bar ? object?.property : baz);',
		'foo ? (bar ? baz : object.property) : object["property"];',
		'foo ? (bar ? baz : object[qux?.property]) : object[qux.property];',
		{
			code: 'foo ? (bar ? baz : object?.property!) : object.property;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo ? object.property : (bar ? object?.property as string : baz);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo ? fallback! : (bar ? fallback : baz);',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		{
			code: 'a ? b ? c : d : d;',
			output: 'a && b ? c : d;',
			errors: 1,
		},
		{
			code: 'a ? d : b ? d : c;',
			output: 'a || b ? d : c;',
			errors: 1,
		},
		{
			code: 'a ? (b ? c : d) : d;',
			output: 'a && b ? c : d;',
			errors: 1,
		},
		{
			code: 'a ? d : (b ? d : c);',
			output: 'a || b ? d : c;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : qux) : qux;',
			output: 'foo && bar ? baz : qux;',
			errors: 1,
		},
		{
			code: 'foo ? qux : (bar ? qux : baz);',
			output: 'foo || bar ? qux : baz;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : qux()) : qux();',
			output: 'foo && bar ? baz : qux();',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : object?.property) : object?.property;',
			output: 'foo && bar ? baz : object?.property;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : 1) : 1;',
			output: 'foo && bar ? baz : 1;',
			errors: 1,
		},
		{
			code: '(foo || bar) ? (baz ?? qux ? value : fallback) : fallback;',
			output: '(foo || bar) && (baz ?? qux) ? value : fallback;',
			errors: 1,
		},
		{
			code: 'foo ? fallback : (bar || baz ? fallback : value);',
			output: 'foo || bar || baz ? fallback : value;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? await baz : fallback) : fallback;',
			output: 'foo && bar ? (await baz) : fallback;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz = qux : fallback) : fallback;',
			output: 'foo && bar ? (baz = qux) : fallback;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : fallback /* comment */) : fallback;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz as string : fallback) : fallback;',
			output: 'foo && bar ? (baz as string) : fallback;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : object?.property!) : object?.property!;',
			output: 'foo && bar ? baz : object?.property!;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'foo\na || b ? (c ? x : y) : y',
			output: 'foo\n;(a || b) && c ? x : y',
			errors: 1,
		},
	],
});
