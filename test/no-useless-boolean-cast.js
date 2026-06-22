import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
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
		'array.some?.(value => Boolean(value.active));',
		'array?.some(value => Boolean(value.active));',
		'array["some"](value => Boolean(value.active));',
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
		'array.some(value => Boolean(/* comment */ value.active));',
		'array.some(value => Boolean(value.active /* comment */));',
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
		outdent`
			array.some(function (value) {
				'use strict';
				return Boolean(value.active);
			});
		`,
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
	],
});
