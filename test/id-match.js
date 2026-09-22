import {getTester, languages} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test} = getTester(import.meta);

const options = ['^[a-z]+$'];
const optionsCheckNamedSpecifiers = ['^[a-z]+$', {checkNamedSpecifiers: true}];
const optionsDoNotCheckNamedSpecifiers = ['^[a-z]+$', {checkNamedSpecifiers: false}];
const optionsCheckProperties = ['^[a-z]+$', {properties: true}];
const optionsCheckClassFields = ['^[a-z]+$', {classFields: true}];
const optionsOnlyDeclarations = ['^[a-z]+$', {onlyDeclarations: true}];
const optionsIgnoreDestructuring = ['^[a-z]+$', {ignoreDestructuring: true}];
const error = {
	messageId: 'notMatch',
};

test({
	valid: [
		{
			code: 'const foo = 1;',
			options,
		},
		{
			code: 'import {foo$ as foo} from "module";',
			options,
		},
		{
			code: 'import {foo$} from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
		},
		{
			code: 'import {foo as bar$} from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
		},
		{
			code: 'import {foo$ as bar$} from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
		},
		{
			code: 'export {foo$} from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
		},
		{
			code: 'export {foo$ as foo} from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
		},
		{
			code: 'export {foo as bar$} from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
		},
		{
			code: 'const object = {foo$: 1};',
			options,
		},
		{
			code: 'class foo { foo$; }',
			options,
		},
		{
			code: 'foo$;',
			options: optionsOnlyDeclarations,
		},
		{
			code: 'const {foo$} = object;',
			options: optionsIgnoreDestructuring,
		},
		{
			code: 'import type {ContraImageFragment$key} from "@/__generated__/ContraImageFragment.graphql";',
			options: optionsDoNotCheckNamedSpecifiers,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
		{
			code: 'const foo$ = 1;',
			options,
			errors: [error],
		},
		{
			code: 'import {foo$} from "module";',
			options,
			errors: [error],
		},
		{
			code: 'import {foo as bar$} from "module";',
			options,
			errors: [error],
		},
		{
			code: 'import {foo$} from "module";',
			options: optionsCheckNamedSpecifiers,
			errors: [error],
		},
		{
			code: 'export {foo$} from "module";',
			options,
			errors: [error],
		},
		{
			code: 'export {foo$} from "module";',
			options: optionsCheckNamedSpecifiers,
			errors: [error],
		},
		{
			code: 'import foo$ from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
			errors: [error],
		},
		{
			code: 'import * as foo$ from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
			errors: [error],
		},
		{
			code: 'export * as foo$ from "module";',
			options: optionsDoNotCheckNamedSpecifiers,
			errors: [error],
		},
		{
			code: 'import {foo$} from "module"; const bar = foo$;',
			options: optionsDoNotCheckNamedSpecifiers,
			errors: [
				{
					...error,
					line: 1,
					column: 42,
					endColumn: 46,
				},
			],
		},
		{
			code: 'import {foo as bar$} from "module"; bar$;',
			options: optionsDoNotCheckNamedSpecifiers,
			errors: [
				{
					...error,
					line: 1,
					column: 37,
					endColumn: 41,
				},
			],
		},
		{
			code: 'const foo = 1; export {foo as bar$};',
			options: optionsDoNotCheckNamedSpecifiers,
			errors: [
				{
					...error,
					line: 1,
					column: 31,
					endColumn: 35,
				},
			],
		},
		{
			code: 'const object = {foo$: 1};',
			options: optionsCheckProperties,
			errors: [error],
		},
		{
			code: 'class foo { foo$; }',
			options: optionsCheckClassFields,
			errors: [error],
		},
		{
			code: 'const foo$ = 1; foo$;',
			options: optionsOnlyDeclarations,
			errors: [error],
		},
		{
			code: 'const {foo$} = object;',
			options,
			errors: [error],
		},
	],
});

test.snapshot({
	valid: [
		'a:hover { background-color: red; animation: ease 1s; }',
		'.good-name#good-id { --good-name: var(--other-name); }',
		'a { --good: red; color: var(--good); }',
		'@keyframes good-name { from { opacity: 0 } }',
		'@layer good.nested; @container good (width > 1px) {}',
		'@media (--good) {}',
		'@media (--badName: 1) {}',
		'a { container: normal / inline-size; container: none / size; }',
		String.raw`.\67 ood {}`,
	].map(code => ({code, language: languages.css, options: ['^[a-z]+(?:-[a-z]+)*$']})),
	invalid: [
		'.badName {}',
		'.--good {}',
		'#--good {}',
		'@layer --good;',
		'@keyframes --good {}',
		'#badName {}',
		'a { --badName: 1; }',
		'a { color: var(--badName); }',
		'@property --badName { syntax: "*"; inherits: false; }',
		'@keyframes badName {}',
		'@-webkit-keyframes "badName" {}',
		'@layer good.badName {}',
		'@import url("style.css") layer(good.badName);',
		'@container badName (width > 1px) {}',
		'a { container-name: badName; }',
		'a { container: badName otherName / inline-size; }',
		'@custom-media --badName screen;',
		'@media (--badName) {}',
		String.raw`@media (/* comment */ --bad\4e ame) {}`,
		String.raw`.bad\4e ame {}`,
	].map(code => ({code, language: languages.css, options: ['^[a-z]+(?:-[a-z]+)*$']})),
});

test.snapshot({
	valid: [
		'<div id="good-name" class="one two-name"></div>',
		'<div id="prefix-{{badName}}" class="{{badName}}"></div>',
		'<div class="{% badName %}"></div>',
		'<div class="<%= badName %>"></div>',
		'<div ID=good-name CLASS="good-name"></div>',
		'<div data-id="badName" title="badName"></div>',
		'<div id="" class=" \t "></div>',
		'<div class="good&#45;name&#32;other"></div>',
	].map(code => ({code, language: languages.html, options: ['^[a-z]+(?:-[a-z]+)*$']})),
	invalid: [
		'<div id="badName"></div>',
		'<div class="good badName\totherName\nvalid"></div>',
		'<div ID=badName CLASS=otherName></div>',
		'<div id="bad&#78;ame" class="good&#32;badName"></div>',
		'<div id="two names"></div>',
	].map(code => ({code, language: languages.html, options: ['^[a-z]+(?:-[a-z]+)*$']})),
});

test.snapshot({
	valid: [{code: '<div class=good/name></div>', language: languages.html, options: ['^[a-z]+/[a-z]+$']}],
	invalid: [],
});

test.snapshot({
	valid: [
		'a { animation-name: good, "good"; }',
		...['none', 'NONE', 'default', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'revert-rule'].map(keyword => `a { animation-name: ${keyword}; }`),
		String.raw`a { animation-name: \6e one; }`,
		'a { animation: badName 1s; content: "badName"; }',
	].map(code => ({code, language: languages.css, options: ['^good$']})),
	invalid: [
		'a { animation-name: badName; }',
		'a { animation-name: badName, "otherName", good; }',
		'a { animation-name: "none", "inherit", normal; }',
		String.raw`a { animation-name: bad\4e ame, "bad\4e ame"; }`,
		String.raw`a { ANIMATION-\6e ame: badName; }`,
		'a { -webkit-animation-name: badName, "otherName"; }',
	].map(code => ({code, language: languages.css, options: ['^good$']})),
});

test.snapshot({
	valid: [
		'a { --good: red; color: var(--good); }',
	].map(code => ({code, language: languages.css, options: ['^[a-z]+$']})),
	invalid: [
		'a { animation-name: --good; }',
		'a { container-name: --good; }',
	].map(code => ({code, language: languages.css, options: ['^[a-z]+$']})),
});

test.snapshot({
	valid: ['a { container-name: none; container: none / inline-size; container-name: revert-rule; container-name: default; }'].map(code => ({code, language: languages.css, options: ['^good$']})),
	invalid: ['a { container-name: normal; container: normal / inline-size; }'].map(code => ({code, language: languages.css, options: ['^good$']})),
});
