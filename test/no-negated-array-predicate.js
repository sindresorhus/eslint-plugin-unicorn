import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'array.some(element => test(element));',
		'array.every(element => test(element));',
		'!array.some(Boolean);',
		'!array.every(Boolean);',
		'!array?.some(element => test(element));',
		'!array.some?.(element => test(element));',
		'!"foo".some(element => test(element));',
		'!new Collection().some(element => test(element));',
		'!array.some(element => { if (foo) { return true; } return test(element); });',
		'!array.some(element => test(/* comment */ element));',
		'! /* comment */ array.some(element => test(element));',
		'!array.some(async element => test(element));',
		'!array.some(function * (element) { return test(element); });',
		{
			code: '!array.some((element): element is string => typeof element === "string");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some<string>(element => test(element));',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'!array.some(element => test(element));',
		'!array.every(element => test(element));',
		'!array.some(element => !test(element));',
		'!array.every(element => !test(element));',
		'!array.some(element => !({}));',
		'!array.some(element => !((foo, bar)));',
		'!array.some((element) => (test(element)));',
		'!array.some(element => element.foo && element.bar);',
		'!array.some(element => element.foo ? element.bar : element.baz);',
		'!array.some(element => { return test(element); });',
		'!array.every(function (element) { return test(element); });',
		'!array.some(function (element) { return !test(element); }, thisArgument);',
		'if (!array.some(element => test(element))) {}',
		'const isMissing = !array.some(element => test(element));',
		'Boolean(!array.every(element => test(element)));',
		'foo(!array.some(element => test(element)));',
		'!((array.some(element => test(element))));',
		outdent`
			foo
			!array.some(element => test(element))
		`,
		outdent`
			foo()
			![].some(element => test(element))
		`,
		outdent`
			function foo() {
				return!array.some(element => test(element));
			}
		`,
		outdent`
			function foo() {
				throw!array.some(element => test(element));
			}
		`,
		{
			code: '!array.some(element => element!.enabled);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(element => (element as Item).enabled);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(element => (element satisfies Item).enabled);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(element => element as unknown);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(element => element satisfies unknown);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<template><div v-if="!array.some(element => test(element))"></div></template>',
			languageOptions: {parser: parsers.vue},
		},
	],
});
