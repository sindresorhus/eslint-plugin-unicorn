import {runInNewContext} from 'node:vm';
import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const ruleId = 'unicorn/prefer-iterator-take-drop';
const linter = new Linter();
const config = {
	plugins: {unicorn: plugin},
	rules: {[ruleId]: 'error'},
};
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

testRule.snapshot({
	valid: [
		'[...iterator].slice(0, 10)',
		'Array.from(iterator).slice(0, 10)',
		'[...array].slice(0, 10)',
		'[...set].slice(0, 10)',
		'[..."unicorn"].slice(0, 2)',
		'array.slice(0, 10)',
		'iterator.take(10).toArray()',
		'const array = iterator.toArray(); array.slice(0, 10)',
		'iterator.toArray().map(fn).slice(0, 10)',
		'[first, ...map.values()].slice(0, 10)',
		'[...map.values(), last].slice(0, 10)',
		'[...first, ...second].slice(0, 10)',
		'Array.from(map.values(), mapper).slice(0, 10)',
		'Uint8Array.from(map.values()).slice(0, 10)',
		'iterator.toArray(true).slice(0, 10)',
		'class LimitedIterator extends Iterator { first() { return super.toArray().slice(0, 10); } }',
		'iterator.toArray(...arguments_).slice(0, 10)',
		'iterator.toArray().slice()',
		'iterator.toArray().slice(0)',
		'iterator.toArray().slice(-0)',
		'iterator.toArray().slice(0, 10, extra)',
		'iterator.toArray().slice(...arguments_)',
		'iterator.toArray().slice(0, ...arguments_)',
		...['-1', '1.5', 'Infinity', 'NaN', 'undefined', 'null', 'true', '"10"', '10n', '9007199254740992', 'limit', 'getLimit()', 'limit++', '(sideEffect(), 10)'].flatMap(bound => [
			`iterator.toArray().slice(${bound}, 20)`,
			`iterator.toArray().slice(0, ${bound})`,
		]),
		'let limit = 10; iterator.toArray().slice(0, limit)',
		'const bounds = {end: 10}; iterator.toArray().slice(0, bounds.end)',
		'const limit = getLimit(); iterator.toArray().slice(0, limit)',
		'iterator?.toArray().slice(0, 10)',
		'iterator.toArray?.().slice(0, 10)',
		'iterator.toArray()?.slice(0, 10)',
		'iterator.toArray().slice?.(0, 10)',
		'object?.iterator.toArray().slice(0, 10)',
		'(iterator?.toArray()).slice(0, 10)',
		'Array?.from(map.values()).slice(0, 10)',
		'Array.from?.(map.values()).slice(0, 10)',
		'[...map?.values()].slice(0, 10)',
		'iterator["toArray"]().slice(0, 10)',
		'iterator.toArray()["slice"](0, 10)',
		'Array["from"](map.values()).slice(0, 10)',
		'[...map["values"]()].slice(0, 10)',
	],
	invalid: [
		'iterator.toArray().slice(0, 10)',
		'iterator.toArray().slice(20, 30)',
		'iterator.toArray().slice(20)',
		'iterator.toArray().slice(0, 0)',
		'iterator.toArray().slice(20, 20)',
		'iterator.toArray().slice(20, 10)',
		'iterator.toArray().slice(-0, 10)',
		'iterator.toArray().slice(0, 0x10)',
		'iterator.toArray().slice(1_000, 2_000)',
		'iterator.toArray().slice(0, Number.MAX_SAFE_INTEGER)',
		'const start = 20; const end = start + 10; iterator.toArray().slice(start, end)',
		'iterator.toArray().slice(2 * 10, 3 * 10)',
		'[...map.values()].slice(0, 10)',
		'[...map.keys()].slice(20)',
		'[...map.entries()].slice(20, 30)',
		'[...string.matchAll(pattern)].slice(0, 10)',
		'Array.from(set.values()).slice(0, 10)',
		'Array.from(map.keys()).slice(20)',
		'Array.from(map.entries()).slice(20, 30)',
		'[...Iterator.from(iterable)].slice(0, 10)',
		'Array.from(globalThis.Iterator.from(iterable)).slice(0, 10)',
		'[...Iterator.concat(first, second)].slice(0, 10)',
		'[...map.values().filter(fn)].slice(0, 10)',
		'Array.from(map.values().map(fn)).slice(20, 30)',
		'[...object?.map.values()].slice(0, 10)',
		'Array.from(object?.map.values()).slice(0, 10)',
		'Array.from({values() { return [1].values(); }}.values()).slice(0, 1)',
		'Array.from(function () {}.values()).slice(0, 1)',
		'Array.from(class {}.values()).slice(0, 1)',
		'Array.from(async function () {}.values()).slice(0, 1)',
		'getIterator().toArray().slice(0, 10)',
		'(condition ? first : second).toArray().slice(0, 10)',
		'((iterator).toArray()).slice((0), (10))',
		'[...(map.values()),].slice(0, 10,)',
		'iterator.toArray().slice(0, 10).map(fn)',
		{
			code: 'const element = <div>{iterator.toArray().slice(0, 10)}</div>',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'function foo() { return[...map.values()].slice(0, 10); }',
		'function foo() { throw[...map.values()].slice(0, 10); }',
		outdent`
			previous()
			Array.from([1, 2].values()).slice(0, 1)
		`,
		outdent`
			Array.from(
				map.values(),
			).slice(20, 30)
		`,
		// Comments inside the preserved iterator expression stay in place.
		'[...map.values(/* comment */)].slice(0, 10)',
		'Array.from((/* comment */ map.values())).slice(0, 10)',
		// Comments outside the iterator expression prevent suggestions.
		'[/* comment */ ...map.values()].slice(0, 10)',
		'[...map.values() /* comment */].slice(0, 10)',
		'Array.from(/* comment */ map.values()).slice(0, 10)',
		'iterator.toArray(/* comment */).slice(0, 10)',
		'iterator.toArray() /* comment */ .slice(0, 10)',
		'iterator.toArray().slice(/* comment */ 0, 10)',
		'iterator.toArray().slice(0, /* comment */ 10)',
		'iterator.toArray().slice(0, 10 /* comment */)',
	],
});

testRule.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		'iterator.toArray<number>().slice(0, 10)',
		'iterator.toArray().slice<number>(0, 10)',
		'Array.from<number>(map.values()).slice(0, 10)',
		'(iterator.toArray() as number[]).slice(0, 10)',
		'(iterator.toArray() satisfies number[]).slice(0, 10)',
		'iterator.toArray()!.slice(0, 10)',
		'(<number[]>iterator.toArray()).slice(0, 10)',
		'function foo(array: number[]) { [...array].slice(0, 10); }',
		'function foo(iterable: Iterable<number>) { [...iterable].slice(0, 10); }',
		'type Iterator<T> = T[]; function foo(iterator: Iterator<number>) { [...iterator].slice(0, 10); }',
	],
	invalid: [
		'(iterator as Iterator<number>).toArray().slice(0, 10)',
		'iterator!.toArray().slice(0, 10)',
		'[...map!.values()].slice(0 as number, 10 satisfies number)',
		'Array.from(map.values() satisfies Iterable<number>).slice(0, 10)',
		'Array.from(<Iterator<number>>map.values()).slice(0, 10)',
		'[...(map.values() as Iterator<number>)].slice(0, 10)',
		'function foo(iterator: Iterator<number>) { [...iterator].slice(0, 10); }',
		'function foo(iterator: IterableIterator<number>) { Array.from(iterator).slice(20); }',
		outdent`
			previous()
			Array.from(map.values() as Iterator<number>).slice(0, 10)
		`,
	],
});

testRule.snapshot({
	valid: [
		typeAware('declare function getArray(): number[]; [...getArray()].slice(0, 10);'),
		typeAware('declare function getIterable(): Iterable<number>; Array.from(getIterable()).slice(0, 10);'),
	],
	invalid: [
		typeAware('declare function getIterator(): IteratorObject<number>; [...getIterator()].slice(0, 10);'),
		typeAware('function * getIterator() { yield 1; } Array.from(getIterator()).slice(0, 10);'),
	],
});

function applySuggestion(t, code, messages = linter.verify(code, config)) {
	const problems = messages.filter(message => message.ruleId === ruleId);
	t.is(problems.length, 1);
	const [problem] = problems;
	t.is(problem.fix, undefined);
	t.is(problem.suggestions.length, 1);
	const {fix} = problem.suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.deepEqual(linter.verify(output, config), []);
	return output;
}

test('suggestions return the same slice values', t => {
	for (const [start, end] of [[0, 3], [2, 5], [2, undefined], [0, 0], [3, 3], [5, 2], [20, 30]]) {
		const argumentsText = end === undefined ? String(start) : `${start}, ${end}`;
		for (const materialization of ['iterator.toArray()', '[...iterator.values()]', 'Array.from(iterator.values())']) {
			const output = applySuggestion(t, `${materialization}.slice(${argumentsText})`);
			for (const input of [[], [0], [0, 1, 2, 3, 4, 5, 6]]) {
				const iterator = materialization === 'iterator.toArray()' ? input.values() : input;
				t.deepEqual(runInNewContext(output, {iterator}), input.slice(start, end));
			}
		}
	}
});

test('bounded suggestions stop an infinite source and run cleanup', t => {
	let consumed = 0;
	let closed = false;
	function * source() {
		try {
			for (let index = 0; ; index++) {
				consumed++;
				yield index;
			}
		} finally {
			closed = true;
		}
	}

	const output = applySuggestion(t, 'iterator.toArray().slice(20, 30)');
	t.deepEqual(runInNewContext(output, {iterator: source()}, {timeout: 1000}), Array.from({length: 10}, (_, index) => index + 20));
	t.is(consumed, 30);
	t.true(closed);
});

test('empty-range suggestions evaluate and close the iterator without consuming it', t => {
	let calls = 0;
	let consumed = 0;
	let closed = 0;
	const output = applySuggestion(t, 'getIterator().toArray().slice(10, 5)');
	const result = runInNewContext(output, {
		getIterator() {
			calls++;
			return Iterator.from({
				next() {
					consumed++;
					return {value: 1, done: false};
				},
				return() {
					closed++;
					return {done: true};
				},
			});
		},
	}, {timeout: 1000});
	t.deepEqual(result, []);
	t.is(calls, 1);
	t.is(consumed, 0);
	t.is(closed, 1);
});

test('suggestions preserve optional iterator expression boundaries', t => {
	for (const code of ['[...object?.map.values()].slice(0, 10)', 'Array.from(object?.map.values()).slice(0, 10)']) {
		const output = applySuggestion(t, code);
		t.throws(() => runInNewContext(code, {object: undefined}), {name: 'TypeError'});
		t.throws(() => runInNewContext(output, {object: undefined}), {name: 'TypeError'});
		t.deepEqual(runInNewContext(output, {object: {map: new Map([['key', 1]])}}), [1]);
	}
});

test('suggestions keep object-leading iterator expressions parseable', t => {
	const code = 'Array.from({values() { return [1].values(); }}.values()).slice(0, 1)';
	const output = applySuggestion(t, code);
	t.deepEqual([...runInNewContext(output)], [1]);
});

test('suggestions preserve regular expressions after postfix updates', t => {
	for (const operator of ['++', '--']) {
		for (const materialization of ['Array.from(/abc/.exec("abc").values())', '[.../abc/.exec("abc").values()]']) {
			const output = applySuggestion(t, `count${operator}\n${materialization}.slice(0, 1)`);
			const context = {count: 1};
			t.deepEqual([...runInNewContext(output, context)], ['abc']);
			t.is(context.count, operator === '++' ? 2 : 0);
		}
	}
});

test('suggestions preserve prefix update operands', t => {
	for (const operator of ['++', '--']) {
		const output = applySuggestion(t, `${operator}Array.from([1].values()).slice(0, 1).length`);
		t.is(runInNewContext(output), operator === '++' ? 2 : 0);
	}
});

test('materialization rules compose without autofix cycles', t => {
	const combinedConfig = {
		...config,
		rules: {
			...config.rules,
			'unicorn/prefer-spread': 'error',
			'unicorn/prefer-iterator-to-array': 'error',
			'unicorn/prefer-iterator-helpers': 'error',
			'unicorn/prefer-iterator-to-array-at-end': 'error',
			'unicorn/no-useless-iterator-to-array': 'error',
			'unicorn/no-useless-spread': 'error',
		},
	};
	for (const code of ['Array.from(Iterator.from(iterable)).slice(0, 10)', '[...Iterator.from(iterable)].slice(20, 30)']) {
		const fixed = linter.verifyAndFix(code, combinedConfig);
		const repeated = linter.verifyAndFix(fixed.output, combinedConfig);
		t.false(repeated.fixed);
		t.is(repeated.output, fixed.output);
		const output = applySuggestion(t, fixed.output, fixed.messages);
		t.deepEqual(linter.verify(output, combinedConfig), []);
	}
});

testRule({
	valid: [],
	invalid: [
		{
			code: 'value!\nArray.from([1].values()).slice(0, 1)',
			output: 'value!\n;[1].values().take(1).toArray()',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const element = <div />\nArray.from([1].values()).slice(0, 1)',
			output: 'const element = <div />\n;[1].values().take(1).toArray()',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'const element = <></>\nArray.from([1].values()).slice(0, 1)',
			output: 'const element = <></>\n;[1].values().take(1).toArray()',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: '!Array.from([1].values()).slice(0, 1)',
			output: '![1].values().take(1).toArray()',
		},
	].map(({code, output, ...options}) => ({
		code,
		...options,
		errors: [{
			messageId: 'prefer-iterator-take-drop',
			data: {replacement: 'take(1)'},
			suggestions: [{
				messageId: 'prefer-iterator-take-drop/suggestion',
				data: {replacement: 'take(1)'},
				output,
			}],
		}],
	})),
});

test('suggestions preserve statement boundaries after functions and classes', t => {
	for (const precedingStatement of ['const fn = function() {}', 'const Constructor = class {}', 'const fn = () => {}', 'function fn() {}', 'class Constructor {}']) {
		for (const iterator of ['[1].values()', '/a/.exec("a").values()', '`a`.matchAll(/a/g).map(match => match[0])']) {
			const code = `${precedingStatement}\nArray.from(${iterator}).slice(0, 1)`;
			const output = applySuggestion(t, code);
			t.deepEqual([...runInNewContext(output)], [...runInNewContext(code)]);
		}
	}
});
