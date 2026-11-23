import {test as nodeTest} from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import unicorn from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

nodeTest('fixing an identity callback checks the Boolean binding at the call', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: {
			'unicorn/no-useless-boolean-cast': 'error',
			'unicorn/prefer-native-coercion-functions': 'error',
		},
	};

	for (const [source, expectedOutput] of [
		['const Boolean = () => false; [1].some(value => !!value);', 'const Boolean = () => false; [1].some(value => value);'],
		['[1].some(Boolean => !!Boolean);', '[1].some(Boolean);'],
	]) {
		const {output, messages} = linter.verifyAndFix(source, config);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.deepStrictEqual(messages, []);
	}
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const guardedPredicate = 'const bits: (0 | 1 | 2)[] = [0, 1, 2]; const ones: 1[] = bits.filter(value => {if (value === 0) {throw new Error();} return !!(value !== 2);});';

test.snapshot({
	valid: [
		'records.filter(record => !!record.owner?.name);',
		'records.filter(record => !record.name);',
		'items.map(item => !!item.label);',
		'[1].some(/** @returns {boolean} */ (value) => !!value);',
		'[1].some(value => /** @type {boolean} */ (!!value));',
		'[1].some(value => /** @type {boolean} */ (Boolean(value + 1)));',
		'[1].some(value => /** @type {boolean} */ (!!(value > 0)));',
		{
			code: 'items.some((item: number): boolean => !!item);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('const bits: (0 | 1 | null)[] = [0, 1]; bits.filter(value => !!value);'),
		typeAware('new Uint8Array([0, 1]).findIndex(value => !!value);'),
		typeAware('const bits: (0 | 1)[] = [0, 1]; bits.filter<1>(value => !!value);'),
	],
	invalid: [
		'records.filter(record => !!record.name);',
		'items.findIndex(item => {return!!item.label;});',
		'items.some(item => !!({label: item.label}));',
		'items.some(item => !/* keep */!item.label);',
		typeAware('const bits: (0 | 1)[] = [0, 1]; bits.filter(value => !!value);'),
		typeAware('const bits: (0 | 1)[] = [0, 1]; if (bits.every(value => !!value)) { const ones: 1[] = bits; }'),
		typeAware('const bits: (0 | 1)[] = [0, 1]; bits.some(value => !!value);'),
		typeAware('const words: string[] = [""]; words.filter(word => !!word);'),
		typeAware('const bits: (0 | 1)[] = [0, 1]; bits.filter(value => !!(value === 1));'),
		typeAware('new Uint8Array([0, 1]).findIndex(value => !!(value > 0));'),
		{
			code: 'const bits: (0 | 1)[] = [0, 1]; bits.filter(value => !!value);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function filter<T extends true>(items: (false | T)[]) { const result: T[] = items.filter(item => !!item); }'),
		typeAware('const bits: (0 | 1)[] = [0, 1]; bits.filter<1>(value => !!(value === 1));'),
		typeAware(guardedPredicate),
		{
			code: guardedPredicate,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			type Item = {kind: 'a'; flag: true} | {kind: 'b'; flag: false} | {kind: 'mixed'; flag: boolean};
			declare const items: Item[];
			const kept = items.filter(item => {
				if (item.kind === 'mixed') {
					throw new Error();
				}

				return (!!item.flag);
			});
			kept.push({kind: 'mixed', flag: true});
		`),
	],
});

test.snapshot({
	valid: [
		'records?.filter(record => !!record.owner?.name);',
		'items.some(item => {function read() {return !!item.label;} return read();});',
		'items.some(item => {if (item.selected) {return;} return !item.label;});',
		'items.some(async item => {const label = await item.getLabel(); return !!label;});',
		'[1].some(/** @type {(item: number) => boolean} */ (item => !!item));',
		{
			code: 'items.some((item): boolean => !!(item.enabled ? (item.count > 0) as unknown : false));',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function keep<T extends string | null>(items: T[]) {return items.some(item => !!item);}'),
		typeAware('function keep<T extends string | undefined>(items: {name: T | number}[]) {return items.some(item => !!item.name);}'),
		typeAware('function keep<T, U extends string | null>(items: (T | U)[]) {return items.some(item => !!item);}'),
		'items[method](item => !!item.name);',
		'items[`some${suffix}`](item => !!item.name);', // eslint-disable-line no-template-curly-in-string
		'items[tag`some`](item => !!item.name);',
		'const collection = {some(predicate) {return predicate(1) === true;}}; collection.some(value => !!value);',
		'({some(predicate) {return predicate(1) === true;}})["some"](value => !!value);',
		outdent`
			// @ts-check
			/** @type {(0 | 1)[]} */
			const bits = [0, 1];
			const asserted = bits.filter(value => /** @type {boolean} */ (Boolean(value === 1)));
			asserted.push(0);
			const constrained = bits.filter(/** @satisfies {(value: 0 | 1) => boolean} */ (value => Boolean(value === 1)));
			constrained.push(0);
		`,
	],
	invalid: [
		'records.filter(record => {const name = record.name.trim(); return !!name;});',
		'items.find(item => {if (item.disabled) {return false;} return !!item.label;});',
		'items.some(item => {if (item.selected) {return !!item.label;} return !!item.name;});',
		'records?.filter(record => !!record.name);',
		'records.some?.(record => !!record.name);',
		'items.some(item => {const label = item.label; return !!(label /* keep */);});',
		'[1].some(/** @returns {boolean} */ (value) => !!(value > 0));',
		{
			code: 'items.filter((item): item is "one" => !!(item === "one"));',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function keep(bits: (0 | 1)[]) {return bits.filter(value => {console.log(value); return !!value;});}'),
		typeAware('function keep(bits: (0 | 1)[]) {return bits.filter(value => {if (value === 0) {return false;} return !!value;});}'),
		typeAware('function keep(bits?: (0 | 1)[]) {return bits?.filter(value => !!value);}'),
		'records["filter"](record => !!record.name);',
		'records[`some`](record => !!record.name);',
		typeAware('function keep(bits?: (0 | 1)[]) {return bits?.["filter"](value => !!value);}'),
		['items.some(item => {', '  return!!item.name;', '});'].join('\r\n'),
		{
			code: 'items.some(item => !!((log(item), /* keep */ item.name) as string));',
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			// @ts-check
			/** @type {(0 | 1)[]} */
			const bits = [0, 1];
			/** @type {1[]} */
			const ones = bits.filter(value => !!value);
		`,
		'records.find(function (record) {return !!this.normalize(record.name);}, options);',
	],
});

test.snapshot({
	valid: [
		'const toBoolean = value => Boolean(value);',
		'array.map(value => Boolean(value.active));',
		'array.some(Boolean);',
		'array.some(value => Boolean(value));',
		'array.some((value, index) => Boolean(value));',
		'array.some(value => value.active);',
		outdent`
			array.some(value => {
				return Boolean(value);
			});
		`,
		outdent`
			array.some(function (value) {
				return Boolean(value);
			});
		`,
		'array.some(value => Boolean());',
		'array.some(value => Boolean(value.active, value.enabled));',
		'array.some(value => Boolean(...value));',
		'array.some(value => Boolean?.(value.active));',
		'array.some(value => new Boolean(value.active));',
		'array.some(value => globalThis.Boolean(value.active));',
		'const Boolean = value => value; array.some(value => Boolean(value.active));',
		'function unicorn(Boolean) { array.some(value => Boolean(value.active)); }',
		'array.some(value => { const Boolean = value => value; return Boolean(value.active); });',
		'array.some(async value => Boolean(value.active));',
		'array.some(function * (value) {return Boolean(value.active);});',
		'array.some(value => {if (value) {return Boolean(value);} return false;});',
		typeAware('new Uint8Array([0, 1])["findIndex"]?.(value => Boolean(value + 1));'),
		'[1].some(/** @returns {boolean} */ value => Boolean(value + 1));',
		typeAware('new Uint8Array([0, 1]).findIndex(value => Boolean(value + 1));'),
		// `Boolean()` normalizes a possibly-`undefined` value from optional chaining, so it is not useless.
		'array.some(value => Boolean(value?.active));',
		'array.some(value => Boolean((value?.active)));',
		'array.some(value => Boolean(value.getActive()?.enabled));',
		'array.some(value => Boolean(value.enabled && value.details?.active));',
		'array.some(value => Boolean(value.enabled || value.details?.active));',
		'array.some(value => Boolean(value.enabled ? value.active : value.details?.active));',
		'array.some(value => Boolean((value.enabled, value.details?.active)));',
		'formFields.some(field => Boolean(field.get(\'name\')?.toLowerCase().includes(\'signature\')));',
		{
			code: 'array.some(value => Boolean(value?.active));',
			languageOptions: {parser: parsers.typescript},
		},
		// Type-aware: keep `Boolean()` when the argument's type includes `undefined`, even without optional-chaining syntax.
		typeAware('[{active: true}].some((value: {active?: boolean}) => Boolean(value.active));'),
		typeAware('[{x: true}].some((value: {x: boolean; y?: {z: boolean}}) => Boolean(value.x && value.y?.z));'),
		// Type-aware: keep `Boolean()` when the argument's type includes `null`.
		typeAware('[{active: true}].some((value: {active: boolean | null}) => Boolean(value.active));'),
		// Type-aware: keep `Boolean()` when the argument's type includes `void`.
		typeAware('[{sideEffect() {}}].some((value: {sideEffect(): void}) => Boolean(value.sideEffect()));'),
		typeAware('[{sideEffect() { return true as boolean | void; }}].some(value => Boolean(value.sideEffect()));'),
		{
			code: 'array.filter((value): boolean => Boolean(value));',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter((value): value is string => Boolean(value));',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'const example = records.filter(({fieldname}) => Boolean(fieldname));',
		'const example = records.every(record => Boolean(record.fieldname));',
		'const example = records.some(record => Boolean(record.fieldname));',
		'const example = records.find(record => Boolean(record.fieldname));',
		'const example = records.findLast(record => Boolean(record.fieldname));',
		'const example = records.findIndex(record => Boolean(record.fieldname));',
		'const example = records.findLastIndex(record => Boolean(record.fieldname));',
		'array.some(value => Boolean(value.active || value.enabled));',
		'array.some(value => Boolean(value?.active ?? false));',
		'array.some(value => Boolean(value?.active || false));',
		'array.some(value => Boolean({active: value.active}));',
		'array.some(value => Boolean((value.active, value.enabled)));',
		'array.some(value => Boolean(({active} = record)));',
		'array.some(value => Boolean((value?.method)()));',
		'array.some(value => Boolean((value?.method).property));',
		'array.some(value => Boolean(value.active), thisArgument);',
		outdent`
			array.some(value => {
				return Boolean(value.active);
			});
		`,
		outdent`
			array.some(function (value) {
				return Boolean(value.active);
			});
		`,
		{
			code: 'array.some(value => Boolean({active: value.active} as Record<string, boolean>));',
			languageOptions: {parser: parsers.typescript},
		},
		// Type-aware: a non-nullish argument type is still reported, so type information only suppresses nullish cases.
		typeAware('[{active: true}].some((value: {active: boolean}) => Boolean(value.active));'),
		'array.some(value => Boolean(/* comment */ value.active));',
		'array.some(value => Boolean(value.active /* comment */));',
		'array.some(function (value) {return Boolean((log(), /* keep */ value.active));});',
		typeAware('const bits: (0 | 1)[] = [0, 1]; const ones = bits.filter(value => Boolean(value === 1)); ones.push(0);'),
		typeAware('const records = [{name: "record"}]; records.filter(record => Boolean(record.name));'),
		'array.some?.(value => Boolean(value.active));',
		'array?.some(value => Boolean(value.active));',
		'array["some"](value => Boolean(value.active));',
		'array.some(value => {if (value.selected) {return Boolean(value.label);} return Boolean(value.name);});',
		outdent`
			array.some(function (value) {
				'use strict';
				return Boolean(value.active);
			});
		`,
		typeAware('function select(bits?: (0 | 1)[]) {return bits?.["filter"](value => Boolean(value === 1));}'),
	],
});
