import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const messageId = 'throw-new-error';
const errors = [{messageId}];

test({
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
	],
	invalid: [
		{
			code: 'throw Error()',
			output: 'throw new Error()',
			errors,
		},
		{
			code: 'throw (Error)()',
			output: 'throw new (Error)()',
			errors,
		},
		{
			code: 'throw lib.Error()',
			output: 'throw new lib.Error()',
			errors,
		},
		{
			code: 'throw lib.mod.Error()',
			output: 'throw new lib.mod.Error()',
			errors,
		},
		{
			code: 'throw lib[mod].Error()',
			output: 'throw new lib[mod].Error()',
			errors,
		},
		{
			code: 'throw (lib.mod).Error()',
			output: 'throw new (lib.mod).Error()',
			errors,
		},
		{
			code: 'throw Error(\'foo\')',
			output: 'throw new Error(\'foo\')',
			errors,
		},
		{
			code: 'throw CustomError(\'foo\')',
			output: 'throw new CustomError(\'foo\')',
			errors,
		},
		{
			code: 'throw FooBarBazError(\'foo\')',
			output: 'throw new FooBarBazError(\'foo\')',
			errors,
		},
		{
			code: 'throw ABCError(\'foo\')',
			output: 'throw new ABCError(\'foo\')',
			errors,
		},
		{
			code: 'throw Abc3Error(\'foo\')',
			output: 'throw new Abc3Error(\'foo\')',
			errors,
		},
		{
			code: 'throw TypeError()',
			output: 'throw new TypeError()',
			errors,
		},
		{
			code: 'throw EvalError()',
			output: 'throw new EvalError()',
			errors,
		},
		{
			code: 'throw RangeError()',
			output: 'throw new RangeError()',
			errors,
		},
		{
			code: 'throw ReferenceError()',
			output: 'throw new ReferenceError()',
			errors,
		},
		{
			code: 'throw SyntaxError()',
			output: 'throw new SyntaxError()',
			errors,
		},
		{
			code: 'throw URIError()',
			output: 'throw new URIError()',
			errors,
		},
		{
			code: 'throw (( URIError() ))',
			output: 'throw (( new URIError() ))',
			errors,
		},
		{
			code: 'throw (( URIError ))()',
			output: 'throw new (( URIError ))()',
			errors,
		},
		{
			code: 'throw getGlobalThis().Error()',
			output: 'throw new (getGlobalThis().Error)()',
			errors,
		},
		{
			code: 'throw utils.getGlobalThis().Error()',
			output: 'throw new (utils.getGlobalThis().Error)()',
			errors,
		},
		{
			code: 'throw (( getGlobalThis().Error ))()',
			output: 'throw new (( getGlobalThis().Error ))()',
			errors,
		},
	],
});
