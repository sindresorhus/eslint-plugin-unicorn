import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['const object = {...(getObject(/* keep */) || {})};', 'const object = {...getObject(/* keep */)};'],
		['const object = {...((/* keep */ foo) ?? {})};', 'const object = {...(/* keep */ foo)};'],
		['const object = {...({/* keep */ value: 1} || {})};', 'const object = {...{/* keep */ value: 1}};'],
		['const object = {...(getObject(// keep\n) ?? {})};', 'const object = {...getObject(// keep\n)};'],
		['const object = {...(getObject(// keep\r\n) ?? {})};', 'const object = {...getObject(// keep\r\n)};'],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'no-useless-fallback-in-spread'}]})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'const object = {...((foo as object /* keep */) ?? {})};',
			output: 'const object = {...(foo as object /* keep */)};',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			'const object = {...(foo || {/* keep */})};',
			'const object = {...((foo) /* keep */ ?? {})};',
		].map(code => ({code, errors: 1})),
	],
});

nodeTest('comment-preserving fallback fixes retain spread results', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-useless-fallback-in-spread': rule}}},
		rules: {'unicorn/no-useless-fallback-in-spread': 'error'},
	};
	for (const operator of ['||', '??']) {
		const code = `JSON.stringify({...((value /* keep */) ${operator} {})});`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		for (const value of [undefined, null, false, 0, '', 'text', {value: 1}, [1, 2]]) {
			t.assert.strictEqual(runInNewContext(output, {value}), runInNewContext(code, {value}));
		}
	}
});

test.snapshot({
	valid: [
		'const array = [...(foo || [])]',
		'const array = [...(foo || {})]',
		'const array = [...(foo && {})]',
		'const object = {...(foo && {})}',
		'const object = {...({} || foo)}',
		'const object = {...({} && foo)}',
		'const object = {...({} ?? foo)}',
		'const object = {...foo}',
		'const object = {...(foo ?? ({} || {}))}',
		'const {...foo} = object',
		'function foo({...bar}){}',
		'const object = {...(foo || {}).toString()}',
		'const object = {...fn(foo || {})}',
		'const object = call({}, ...(foo || {}))',
		'const object = {...(foo || {not: "empty"})}',
		'const object = {...(foo || {...{}})}',
		'const object = {...(foo ? {bar: true} : {})}',
		'const object = {...(!foo ? {} : {bar: true})}',
		'const object = {...(foo ? {a: 1} : {b: 2})}',
		'const object = {...(foo ? {} : {})}',
		'const object = {...(foo ? foo : {})}',
		'const object = {...(!foo ? {} : foo)}',
		'const object = {...(foo.bar ? foo.bar : {})}',
		'const array = [...(foo ? {a: 1} : {})]',
		'const object = {...(foo ? {a: 1} : {}).bar}',
	],
	invalid: [
		'const object = {...(foo || {})}',
		'const object = {...(foo ?? {})}',
		'const object = {...(foo ?? (( {} )))}',
		'const object = {...((( foo )) ?? (( {} )))}',
		'const object = {...(( (( foo )) ?? (( {} )) ))}',
		'async ()=> ({...((await foo) || {})})',
		'const object = {...(0 || {})}',
		'const object = {...((-0) || {})}',
		'const object = {...(.0 || {})}',
		'const object = {...(0n || {})}',
		'const object = {...(false || {})}',
		'const object = {...(null || {})}',
		'const object = {...(undefined || {})}',
		'const object = {...((a && b) || {})}',
		'const object = {...(NaN || {})}',
		'const object = {...("" || {})}',
		'const object = {...([] || {})}',
		'const object = {...({} || {})}',
		'const object = {...(foo || {}),}',
		// Report but don't drop comments in the removed part
		'const object = {...(foo /* keep */ || {})}',
		'const object = {...(foo || /* keep */ {})}',
		'const object = {...((foo ?? {}) || {})}',
		'const object = {...((foo && {}) || {})}',
		'const object = {...(foo && {} || {})}',
		'const object = {...({...(foo || {})})}',
		'const object = {...({...((0, foo) || {})})}',
		'function foo(a = {...(bar || {})}){}',
		// The only case we'll break, but we should not care about it.
		'const object = {...(document.all || {})}',
	],
});
