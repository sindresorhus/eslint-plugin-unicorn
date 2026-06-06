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
		'(foo?.bar).baz === "a" || (foo?.bar).baz === "b";',
		'value === "a" || value === foo?.bar;',
		'foo === bar || bar === foo;',
		'foo === foo || foo === foo;',
		'foo === bar || foo === foo;',
		'foo === 1 || bar === 1;',
		{
			code: 'value === "a" || value === "b";',
			options: [{minimumComparisons: 3}],
		},
		{
			code: '(foo?.bar as Foo).baz === "a" || (foo?.bar as Foo).baz === "b";',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'value === "a" || value === "b";',
		'"a" === value || "b" === value;',
		'value === "a" || "b" === value;',
		'args[0] === "-h" || args[0] === "--help";',
		'object.value === "a" || object.value === "b";',
		'(value === "a") || (value === "b");',
		'(value === "a" || value === "b") && otherValue;',
		'value === "a" || value === "b" || value === "c";',
		{
			code: 'value === "a" || value === "b" || value === "c";',
			options: [{minimumComparisons: 3}],
		},
		{
			code: outdent`
				value! === "a" || value! === "b";
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value satisfies string) === "a" || (value satisfies string) === "b";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value as {foo?: string}) === "a" || (value as {foo?: string}) === "b";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(object satisfies Foo).value === "a" || (object satisfies Foo).value === "b";',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
