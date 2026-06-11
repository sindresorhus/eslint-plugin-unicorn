import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const toBoolean = value => Boolean(value);',
		'array.map(value => Boolean(value.active));',
		'array.some(Boolean);',
		'array.some(value => value.active);',
		'array.some?.(value => Boolean(value.active));',
		'array?.some(value => Boolean(value.active));',
		'array["some"](value => Boolean(value.active));',
		'array.some(value => Boolean());',
		'array.some(value => Boolean(value.active, value.enabled));',
		'array.some(value => Boolean(...value));',
		'array.some(value => Boolean?.(value.active));',
		'array.some(value => new Boolean(value.active));',
		'array.some(value => globalThis.Boolean(value.active));',
		'array.some(async value => Boolean(value.active));',
		'array.some(function * (value) {return Boolean(value.active);});',
		'array.some(value => Boolean(/* comment */ value.active));',
		'array.some(value => Boolean(value.active /* comment */));',
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
		'array.some(value => Boolean({active: value.active}));',
		'array.some(value => Boolean((value.active, value.enabled)));',
		'array.some(value => Boolean(({active} = record)));',
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
	],
});
