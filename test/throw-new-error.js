import {outdent} from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescriptDecoratorsLanguageOptions = {
	parser: parsers.typescript,
	parserOptions: {
		ecmaFeatures: {
			decorators: true,
		},
	},
};

test.snapshot({
	valid: [
		'throw new Error()',
		'new Error()',
		'throw new TypeError()',
		'throw new EvalError()',
		'throw new RangeError()',
		'throw new ReferenceError()',
		'throw new SyntaxError()',
		'throw new URIError()',
		'throw new CustomError()',
		'throw new FooBarBazError()',
		'throw new ABCError()',

		// Not `FooError` like
		'throw getError()',
		// Not `CallExpression`
		'throw CustomError',
		// Not `Identifier` / `MemberExpression`
		'throw getErrorConstructor()()',
		// `MemberExpression.computed`
		'throw lib[Error]()',
		// `MemberExpression.property` not `Identifier`
		'throw lib["Error"]()',
		// Not `FooError` like
		'throw lib.getError()',
		// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2654 (Effect library)
		'class QueryError extends Data.TaggedError(\'QueryError\') {}',
		{
			code: outdent`
				function RegisterServiceError() {
					return function <T extends new (...arguments_: any[]) => Error>(constructor: T) {
						return constructor;
					};
				}

				@RegisterServiceError()
				export class SomeError extends Error {}
			`,
			languageOptions: typescriptDecoratorsLanguageOptions,
		},
		{
			code: outdent`
				@decorators.RegisterServiceError()
				export class SomeError extends Error {}
			`,
			languageOptions: typescriptDecoratorsLanguageOptions,
		},
		{
			code: outdent`
				class Service {
					@OnQueueError()
					handle() {}
				}
			`,
			languageOptions: typescriptDecoratorsLanguageOptions,
		},
	],
	invalid: [
		'throw Error()',
		'throw (Error)()',
		'throw lib.Error()',
		'throw lib.mod.Error()',
		'throw lib[mod].Error()',
		'throw (lib.mod).Error()',
		'throw Error(\'foo\')',
		'throw CustomError(\'foo\')',
		'throw FooBarBazError(\'foo\')',
		'throw ABCError(\'foo\')',
		'throw Abc3Error(\'foo\')',
		'throw TypeError()',
		'throw EvalError()',
		'throw RangeError()',
		'throw ReferenceError()',
		'throw SyntaxError()',
		'throw URIError()',
		'throw (( URIError() ))',
		'throw (( URIError ))()',
		'throw getGlobalThis().Error()',
		'throw utils.getGlobalThis().Error()',
		'throw (( getGlobalThis().Error ))()',
		'const error = Error()',
		'throw Object.assign(Error(), {foo})',
		outdent`
			new Promise((resolve, reject) => {
				reject(Error('message'));
			});
		`,
		outdent`
			function foo() {
				return[globalThis][0].Error('message');
			}
		`,
		{
			code: outdent`
				@Decorator(Error())
				export class SomeError extends Error {}
			`,
			languageOptions: typescriptDecoratorsLanguageOptions,
		},
	],
});
