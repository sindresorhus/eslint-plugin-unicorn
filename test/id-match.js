import {getTester} from './utils/test.js';
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
