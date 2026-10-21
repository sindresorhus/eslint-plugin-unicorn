import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {Map<string, number>} values */ function run(values) { return values.join(); }',
			'/** @returns {string} */ function read() { return source; } read().join();',
			'/** @param {() => boolean} read */ function run(read) { return read().join(); }',
			'/** @type {ReadonlySet<number>} */ const values = source; const alias = values; alias.join();',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			[
				'/** @param {Array<number>} values */ function run(values) { return values.join(); }',
				'/** @param {Array<number>} values */ function run(values) { return values.join(\',\'); }',
			],
			[
				'/** @returns {Uint8Array} */ function read() { return source; } read().join();',
				'/** @returns {Uint8Array} */ function read() { return source; } read().join(\',\');',
			],
			[
				'/** @param {() => ReadonlyArray<number>} read */ function run(read) { return read()?.join(); }',
				'/** @param {() => ReadonlyArray<number>} read */ function run(read) { return read()?.join(\',\'); }',
			],
			[
				'/** @param {unknown} values */ function run(values) { return values.join(); }',
				'/** @param {unknown} values */ function run(values) { return values.join(\',\'); }',
			],
			[
				'/** @param {Array<number> | Set<number>} values */ function run(values) { return values.join(); }',
				'/** @param {Array<number> | Set<number>} values */ function run(values) { return values.join(\',\'); }',
			],
			[
				'/** @param {Set<number>} values */ function run(values) { return Array.prototype.join.call(values); }',
				'/** @param {Set<number>} values */ function run(values) { return Array.prototype.join.call(values, \',\'); }',
			],
			[
				'/** @param {Array<number>} values */ function run(values) { return values.join(/* keep */); }',
				'/** @param {Array<number>} values */ function run(values) { return values.join(/* keep */\',\'); }',
			],
		].map(([code, output]) => ({
			code, output, filename: 'file.ts', errors: [{messageId: 'require-array-join-separator'}],
		})),
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			code: '/** @param {Array<number>} values */ function run(values: Set<number>) { return values.join(); }',
			filename: 'file.ts',
		}],
		invalid: [{
			code: '/** @param {Set<number>} values */ function run(values: Uint8Array) { return values.join(); }',
			output: '/** @param {Set<number>} values */ function run(values: Uint8Array) { return values.join(\',\'); }',
			filename: 'file.ts',
			errors: [{messageId: 'require-array-join-separator'}],
		}],
	});
}

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: Set<number>) { foo.join(); }',
			languageOptions: {parser: parsers.typescript},
		},
		'foo.join(",")',
		'join()',
		'foo.join(...[])',
		'foo.join?.()',
		'foo?.join?.()',
		'foo[join]()',
		'foo["join"]()',
		'[].join.call(foo, ",")',
		'[].join.call()',
		'[].join.call(...[foo])',
		'[].join?.call(foo)',
		'[]?.join.call(foo)',
		'[].join[call](foo)',
		'[][join].call(foo)',
		'[,].join.call(foo)',
		'[].join.notCall(foo)',
		'[].notJoin.call(foo)',
		'Array.prototype.join.call(foo, "")',
		'Array.prototype.join.call()',
		'Array.prototype.join.call(...[foo])',
		'Array.prototype.join?.call(foo)',
		'Array.prototype?.join.call(foo)',
		'Array?.prototype.join.call(foo)',
		'Array.prototype.join[call](foo, "")',
		'Array.prototype[join].call(foo)',
		'Array[prototype].join.call(foo)',
		'Array.prototype.join.notCall(foo)',
		'Array.prototype.notJoin.call(foo)',
		'Array.notPrototype.join.call(foo)',
		'NotArray.prototype.join.call(foo)',
		'path.join(__dirname, "./foo.js")',
	],
	invalid: [
		'foo.join()',
		// The `[].join.call(foo)` form is reported even for a known non-array receiver; the guard only applies to `foo.join()`
		{
			code: 'function f(foo: Set<number>) { [].join.call(foo); }',
			languageOptions: {parser: parsers.typescript},
		},
		'[].join.call(foo)',
		'[].join.call(foo,)',
		'[].join.call(foo , );',
		'Array.prototype.join.call(foo)',
		'Array.prototype.join.call(foo, )',
		outdent`
			(
				/**/
				[
					/**/
				]
					/**/
					.
					/**/
					join
					/**/
					.
					/**/
					call
					/**/
					(
						/**/
						(
							/**/
							foo
							/**/
						)
						/**/
						,
						/**/
					)/**/
			)
		`,
		'foo?.join()',
		// A typed array shares `Array#join()` and its comma default
		{
			code: 'function f(foo: Int8Array) { foo.join(); }',
			languageOptions: {parser: parsers.typescript},
		},
		// The same receiver spelled as a constructor call must agree with the annotation above
		'const foo = new Int8Array(); foo.join();',
	],
});
