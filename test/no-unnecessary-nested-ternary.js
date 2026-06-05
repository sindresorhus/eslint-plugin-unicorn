import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
			output: null,
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
	],
});
