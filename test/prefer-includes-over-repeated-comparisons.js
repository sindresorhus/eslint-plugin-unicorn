import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'value === "a";',
		'value === "a" || otherValue === "b";',
		'value == "a" || value == "b";',
		'value !== "a" && value !== "b";',
		'value === "a" || isValue(value);',
		'value === "a" || value !== "b";',
		'value === "a" || value === "b" || otherValue === "c";',
		'getValue() === "a" || getValue() === "b";',
		'getObject().value === "a" || getObject().value === "b";',
		'object[getKey()] === "a" || object[getKey()] === "b";',
		'value === getValue() || value === "b";',
		'value === "a" || value === getValue();',
		'value === (otherValue = "a") || value === "b";',
		'value === ++otherValue || value === "b";',
		'value === Number.NaN || value === 1;',
		'value === NaN || value === 1;',
		'Number.NaN === value || Number.NaN === otherValue;',
		'NaN === value || NaN === otherValue;',
		'foo?.bar === "a" || foo?.bar === "b";',
		'foo?.bar === "a" || foo.bar === "b";',
		'foo.bar === "a" || foo?.bar === "b";',
		'foo[bar?.baz] === "a" || foo[bar?.baz] === "b";',
		'foo[bar?.()] === "a" || foo[bar?.()] === "b";',
		'(foo?.bar).baz === "a" || (foo?.bar).baz === "b";',
		'value === "a" || value === foo?.bar;',
		'value === (foo?.bar ?? "a") || value === "b";',
		'foo === bar || bar === foo;',
		'foo === foo || foo === foo;',
		'foo === bar || foo === foo;',
		'foo === 1 || bar === 1;',
		'value === "a" || value === "b";',
		'"a" === value || "b" === value;',
		'value === "a" || "b" === value;',
		'value === first || value === second;',
		'args[0] === "-h" || args[0] === "--help";',
		'object.value === "a" || object.value === "b";',
		'object.foo === "a" || object["foo"] === "b";',
		'object[key] === "a" || object[key] === "b";',
		'value === object.a || value === object.b;',
		'(value === "a") || (value === "b");',
		'(value === "a" || value === "b") && otherValue;',
		// Distinct expressions compared against the same `undefined` value (#3304)
		'state.a === undefined || state.b === undefined || state.c === undefined;',
		'undefined === a || undefined === b || undefined === c;',
		// `null` is a literal (not a reference), so it behaves the same way
		'a === null || b === null || c === null;',
		// A shared subject early on is dropped once a later operand compares a distinct expression
		'a === undefined || a === "x" || b === undefined;',
		// TypeScript-wrapped `undefined` is still excluded as a shared reference
		{
			code: 'a === (undefined as any) || b === (undefined as any) || c === (undefined as any);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'value === "a" || value === "b";',
			options: [{minimumComparisons: 4}],
		},
		{
			code: '(foo?.bar as Foo).baz === "a" || (foo?.bar as Foo).baz === "b";',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'value === "a" || value === "b" || value === "c";',
		// `undefined`/`null` are fine as compared values when the subject is shared (#3304)
		'value === undefined || value === "a" || value === "b";',
		{
			code: 'value === null || value === undefined;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === "a" || value === "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: '"a" === value || "b" === value;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === "a" || "b" === value;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === first || value === second;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'args[0] === "-h" || args[0] === "--help";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'object.value === "a" || object.value === "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'object.foo === "a" || object["foo"] === "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'object[key] === "a" || object[key] === "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === object.a || value === object.b;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: '(value === "a") || (value === "b");',
			options: [{minimumComparisons: 2}],
		},
		{
			code: '(value === "a" || value === "b") && otherValue;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === "a" || value === "b" || value === "c";',
			options: [{minimumComparisons: 3}],
		},
		{
			code: outdent`
				value! === "a" || value! === "b" || value! === "c";
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value satisfies string) === "a" || (value satisfies string) === "b" || (value satisfies string) === "c";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value as {foo?: string}) === "a" || (value as {foo?: string}) === "b" || (value as {foo?: string}) === "c";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(object satisfies Foo).value === "a" || (object satisfies Foo).value === "b" || (object satisfies Foo).value === "c";',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
