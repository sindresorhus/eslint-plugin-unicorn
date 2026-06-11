import {getTester} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test} = getTester(import.meta);

const options = ['^[a-z]+$'];
const optionsSkipNamedImports = ['^[a-z]+$', {checkNamedImports: false}];
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
			options: optionsSkipNamedImports,
		},
		{
			code: 'import {foo as bar$} from "module";',
			options: optionsSkipNamedImports,
		},
		{
			code: 'import {foo$ as bar$} from "module";',
			options: optionsSkipNamedImports,
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
			options: optionsSkipNamedImports,
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
			code: 'import foo$ from "module";',
			options: optionsSkipNamedImports,
			errors: [error],
		},
		{
			code: 'import * as foo$ from "module";',
			options: optionsSkipNamedImports,
			errors: [error],
		},
		{
			code: 'import {foo$} from "module"; const bar = foo$;',
			options: optionsSkipNamedImports,
			errors: [error],
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
