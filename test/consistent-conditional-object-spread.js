import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		{
			code: 'const object = {...(flag ? {/* keep */ value} : {})};',
			output: 'const object = {...(flag && {/* keep */ value})};',
			errors: [{messageId: 'consistent-conditional-object-spread', data: {expectedStyle: 'logical'}}],
		},
		{
			code: 'const object = {...(!(/* keep */ flag) ? {} : data)};',
			output: 'const object = {...((/* keep */ flag) && data)};',
			errors: [{messageId: 'consistent-conditional-object-spread', data: {expectedStyle: 'logical'}}],
		},
		{
			code: 'const object = {...(read(/* keep */) && data)};',
			options: ['ternary'],
			output: 'const object = {...(read(/* keep */) ? data : {})};',
			errors: [{messageId: 'consistent-conditional-object-spread', data: {expectedStyle: 'ternary'}}],
		},
		{
			code: 'const object = {...(Boolean(read(/* keep */)) && data)};',
			output: 'const object = {...(read(/* keep */) && data)};',
			errors: [{messageId: 'unnecessary-boolean-cast'}],
		},
	],
});

test({
	valid: [],
	invalid: [
		...[
			['const object = {...((flag /* keep */) ? data : {})};', 'const object = {...((flag /* keep */) && data)};'],
			['const object = {...(read(/* keep */) ? {} : data)};', 'const object = {...(!read(/* keep */) && data)};'],
			['const object = {...(!(flag // keep\r\n) ? {} : data)};', 'const object = {...((flag // keep\r\n) && data)};'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'const object = {...(Boolean(value as /* keep */ string) && data)};',
			output: 'const object = {...(value as /* keep */ string && data)};',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'const object = {...((flag as /* keep */ boolean) && data)};',
			options: ['ternary'],
			output: 'const object = {...((flag as /* keep */ boolean) ? data : {})};',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			'const object = {...(!/* discard */ flag ? {} : data)};',
			'const object = {...((/* discard */ !flag) ? {} : data)};',
			'const object = {...(flag ? data : {/* discard */})};',
			'const object = {...(Boolean(/* discard */ value) && data)};',
			'const object = {...(!/* discard */!value && data)};',
		].map(code => ({code, errors: 1})),
	],
});

nodeTest('comment-preserving conditional spreads retain short-circuiting and evaluate operands once', t => {
	const linter = new Linter();
	for (const [expression, style] of [
		['read(/* keep */) ? branch() : {}', 'logical'],
		['read(/* keep */) ? {} : branch()', 'logical'],
		['!read(/* keep */) ? {} : branch()', 'logical'],
		['Boolean(read(/* keep */)) && branch()', 'logical'],
		['!!read(/* keep */) && branch()', 'logical'],
		['read(/* keep */) && branch()', 'ternary'],
	]) {
		const code = `const object = {...(${expression})}; JSON.stringify(object);`;
		const config = {
			plugins: {unicorn: {rules: {'consistent-conditional-object-spread': rule}}},
			rules: {'unicorn/consistent-conditional-object-spread': ['error', style]},
		};
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output.split('/* keep */').length, 2);
		for (const value of [undefined, false, 0, '', true, 1, 'value']) {
			const execute = source => {
				const events = [];
				const result = runInNewContext(source, {
					read() {
						events.push('test');
						return value;
					},
					branch() {
						events.push('branch');
						return {value: 1};
					},
				});
				t.assert.strictEqual(events.filter(event => event === 'test').length, 1);
				return {events, result};
			};

			t.assert.deepStrictEqual(execute(output), execute(code));
		}
	}
});

test.snapshot({
	valid: [
		'const object = {...(foo && {bar: true})}',
		'const object = {...(!foo && {bar: true})}',
		'const object = {...(foo && bar)}',
		'const object = {...(foo || {})}',
		'const object = {...(foo ?? {})}',
		'const object = {...(foo && {})}',
		'const object = {...(foo ? {bar: true} : {baz: true})}',
		'const object = {...(foo ? {} : {})}',
		'const object = {...(foo ? foo : {})}',
		'const object = {...(!foo ? {} : foo)}',
		'const object = {...(foo.bar ? foo.bar : {})}',
		'const object = {...(foo() ? foo() : {})}',
		'async () => ({...(await foo ? await foo : {})})',
		'const object = {...(foo == null ? {} : foo)}',
		'const object = {...(foo != null ? foo : {})}',
		'const object = {...(foo === null || foo === undefined ? {} : foo)}',
		'const object = {...(foo !== null && foo !== undefined ? foo : {})}',
		'const object = {...(foo == null ? undefined : foo)}',
		'const object = {...(foo == null ? null : foo)}',
		'const object = {...(foo != null ? foo : null)}',
		'const object = {...(foo ? undefined : undefined)}',
		'const object = {...(foo ? null : null)}',
		// `void 0` is not the `undefined` identifier, so it is not treated as an empty branch.
		'const object = {...(foo ? {bar: true} : void 0)}',
		'const array = [...(foo ? {bar: true} : {})]',
		'const object = {...(foo ? {bar: true} : {}).bar}',
		// Not a boolean cast.
		'const object = {...(Boolean() && {a: 1})}',
		'const object = {...(Boolean(foo, bar) && {a: 1})}',
		'const object = {...(Boolean(...foo) && {a: 1})}',
		'const object = {...(Boolean?.(foo) && {a: 1})}',
		'const object = {...(new Boolean(foo) && {a: 1})}',
		'const object = {...(foo.Boolean(bar) && {a: 1})}',
		'const object = {...(Number(foo) && {a: 1})}',
		'const Boolean = value => value; const object = {...(Boolean(foo) && {a: 1})}',
		'const object = {...(!Boolean(foo) && {a: 1})}',
		// The boolean cast is not the left side of a spread `&&`.
		'const object = {...(!!foo || {a: 1})}',
		'const object = {...(!!foo ?? {a: 1})}',
		'const object = {...(foo && !!bar)}',
		'const object = {...!!foo}',
		'const object = {...(!!foo && bar).baz}',
		'const array = [...(!!foo && [1])]',
		'const value = !!foo && {a: 1}',
		'foo(!!bar && {a: 1})',
		// Operands of a nested `||` or `??` are not checked. Removing the cast here would change the result.
		'const object = {...((!!foo ?? bar) && {a: 1})}',
		// Removing the cast here would be safe, but it is not checked, to keep the rule simple.
		'const object = {...((!!foo || bar) && {a: 1})}',
		// Only the left operands of the outermost `&&` chain are checked.
		'const object = {...(foo && (!!bar && {a: 1}))}',
		{
			code: 'const object = {...((!!foo as boolean) && {a: 1})}',
			languageOptions: {parser: parsers.typescript},
		},
		// JSX spread attributes are not object spreads.
		{
			code: 'const element = <div {...(!!foo && {a: 1})} />',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'const object = {...(foo && {bar: true})}',
			options: ['logical'],
		},
		{
			code: 'const object = {...(foo ? {bar: true} : {})}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && undefined)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && null)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && foo)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo.bar && foo.bar)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo() && foo())}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo != null && foo)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...((foo !== null && foo !== undefined) && foo)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo !== null && foo !== undefined && foo)}',
			options: ['ternary'],
		},
		{
			code: 'async () => ({...(await foo && await foo)})',
			options: ['ternary'],
		},
		'const object = {...(foo || bar ? foo || bar : {})}',
		'const object = {...(!foo ? !foo : {})}',
		'const object = {...(null == foo ? {} : foo)}',
		'const object = {...(undefined === foo || null === foo ? {} : foo)}',
		'const object = {...(foo == null ? /* keep */ {} : foo)}',
	],
	invalid: [
		'const object = {...(foo ? {bar: true} : {})}',
		'const object = {...(foo ? {} : {bar: true})}',
		'const object = {...(!foo ? {} : {bar: true})}',
		'const object = {...(foo ? bar : {})}',
		'const object = {...(foo ? {} : bar)}',
		'const object = {...(a || b ? {x: 1} : {})}',
		'const object = {...(a && b ? {} : {x: 1})}',
		'const object = {...(a ?? b ? {x: 1} : {})}',
		'async () => ({...(await foo ? {a: 1} : {})})',
		'const object = {...((a, b) ? {x: 1} : {})}',
		'const object = {...((a, b) ? {} : {x: 1})}',
		'const object = {...(foo ? (() => x) : {})}',
		'const object = {...(foo ? a || b : {})}',
		'const object = {...(foo ? a ?? b : {})}',
		'const object = {...(foo ? {} : a ?? b)}',
		'const object = {...(foo?.bar ? {a: 1} : {})}',
		'const object = {...((( foo )) ? (( {a: 1} )) : (( {} )))}',
		'const object = ({...foo ? {a: 1} : {}})',
		'const object = {...(!!foo ? {} : {bar: true})}',
		{
			code: 'const object = {...(foo ? bar! : {})}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(foo as string ? {} : bar)}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(foo satisfies string ? {} : bar)}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(<string>foo ? {} : bar)}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(foo! ? {} : bar)}',
			languageOptions: {parser: parsers.typescript},
		},
		'const object = {...(foo ? {bar: true} : undefined)}',
		'const object = {...(foo ? {bar: true} : null)}',
		'const object = {...(foo ? undefined : {bar: true})}',
		'const object = {...(!foo ? undefined : {bar: true})}',
		'const object = {...(foo ? null : {bar: true})}',
		'const object = {...(foo ? bar : undefined)}',
		'const object = {...(foo ? null : bar)}',
		// The nullish guard does not apply when its reference differs from the kept branch.
		'const object = {...(foo == null ? undefined : bar)}',
		'const object = {...(foo != null ? bar : undefined)}',
		'const object = {...(foo ? {a: 1} : /* keep */ {})}',
		'const object = {...(foo ? {a: 1} : /* keep */ undefined)}',
		'const object = {...(foo ? {a: 1} : /* keep */ null)}',
		'const object = {...(/* keep */ foo ? {a: 1} : {})}',
		{
			code: 'const object = {...(foo && {bar: true})}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(!foo && {bar: true})}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && bar)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...((a || b) && {x: 1})}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...((a, b) && {x: 1})}',
			options: ['ternary'],
		},
		{
			code: 'async () => ({...(await foo && {a: 1})})',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && (() => x))}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && (a = b))}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && (a, b))}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && bar!)}',
			options: ['ternary'],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(foo /* keep */ && {bar: true})}',
			options: ['ternary'],
		},
		'const object = {...(!!foo && {bar: true})}',
		'const object = {...!!foo && {bar: true}}',
		'const object = {...(Boolean(foo) && {bar: true})}',
		'const object = {...(!!foo && bar)}',
		'const object = {...(!!foo.bar && {a: 1})}',
		'const object = {...(!!foo() && {a: 1})}',
		'const object = {...(!!(foo) && {a: 1})}',
		'const object = {...((!!foo) && {a: 1})}',
		'const object = {...(!(!foo) && {a: 1})}',
		'const object = {...(!!!foo && {a: 1})}',
		'const object = {...(Boolean(!!foo) && {a: 1})}',
		'const object = {...(!!(a || b) && {x: 1})}',
		'const object = {...(Boolean(a || b) && {x: 1})}',
		'const object = {...(!!(a ?? b) && {x: 1})}',
		'const object = {...(Boolean(a ?? b) && {x: 1})}',
		'const object = {...(!!(a && b) && {x: 1})}',
		'const object = {...(Boolean(a && b) && {x: 1})}',
		'const object = {...(Boolean((a, b)) && {x: 1})}',
		'const object = {...(Boolean(a = b) && {x: 1})}',
		'const object = {...(Boolean(a ? b : c) && {x: 1})}',
		'const object = {...((!!(a || b)) && {x: 1})}',
		'async () => ({...(!!await foo && {a: 1})})',
		'const object = {...(!!foo && {a: 1}), ...(Boolean(bar) && {b: 2})}',
		'const object = {...(!! /* keep */ foo && {a: 1})}',
		'const object = {...(Boolean(foo /* keep */) && {a: 1})}',
		'const object = {...(!!(/* keep */ foo) && {a: 1})}',
		'const object = {...(!!foo ? {a: 1} : {})}',
		{
			code: 'const object = {...(!!foo! && {a: 1})}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(Boolean(foo as string) && {a: 1})}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(Boolean(foo satisfies string) && {a: 1})}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(!!<string>foo && {a: 1})}',
			languageOptions: {parser: parsers.typescript},
		},
		// The `ternary` style does not check boolean casts.
		{
			code: 'const object = {...(!!foo && {a: 1})}',
			options: ['ternary'],
		},
		'const object = {...(!!foo?.bar && {a: 1})}',
		'const object = {...(!!foo && bar && {a: 1})}',
		'const object = {...(foo && !!bar && {a: 1})}',
		'const object = {...(!!a && Boolean(b) && !!c && {x: 1})}',
		'const object = {...(a && !!(b || c) && {x: 1})}',
		'const object = {...(a && Boolean(b ?? c) && {x: 1})}',
		'const object = {...(a && Boolean(b && c) && {x: 1})}',
		'const object = {...(!!a && !! /* keep */ b && {x: 1})}',
		'const object = {...(!!foo /* keep */ && {a: 1})}',
		'const object = {...(!!foo && {})}',
		{
			code: 'const element = <div style={{...(!!foo && {color: \'red\'})}} />',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'function * generator() {\n\treturn {...(Boolean(yield foo) && {a: 1})};\n}',
		// The ternary fix only removes a leading `!`, so `Boolean()` is kept.
		'const object = {...(Boolean(foo) ? {} : {a: 1})}',
		// Update expressions have side effects, so they are never the same value.
		'const object = {...(foo++ ? foo++ : {})}',
		'const object = {...(foo || bar ? foo && bar : {})}',
		'const object = {...(foo === bar ? {} : foo)}',
	],
});
