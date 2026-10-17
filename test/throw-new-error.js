import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {outdent} from 'outdent';
import {transpileModule, ScriptTarget} from 'typescript';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const typescriptDecoratorsLanguageOptions = {
	parser: parsers.typescript,
	parserOptions: {
		ecmaFeatures: {
			decorators: true,
		},
	},
};

// A call inside a constructor's receiver must keep its argument list.
test({
	valid: [],
	invalid: [
		...[
			['getTag()`x`.Error("message")', 'new (getTag()`x`.Error)("message")'],
			['getTag()`x``y`.nested.Error("message")', 'new (getTag()`x``y`.nested.Error)("message")'],
			['getTag`x`.Error("message")', 'new getTag`x`.Error("message")'],
		].map(([code, output]) => ({code, output, errors: 1})),
		...[
			['getErrors()!.Error("message")', 'new (getErrors()!.Error)("message")'],
			['getErrors()!.nested.Error("message")', 'new (getErrors()!.nested.Error)("message")'],
			['getErrors() /* keep */ !.Error("message")', 'new (getErrors() /* keep */ !.Error)("message")'],
			['getTag()!`x`.Error("message")', 'new (getTag()!`x`.Error)("message")'],
			['((getErrors()!.Error))("message")', 'new ((getErrors()!.Error))("message")'],
		].map(([code, output]) => ({
			code, output, errors: 1, languageOptions: {parser: parsers.typescript},
		})),
	],
});

nodeTest('constructor fixes preserve calls in receivers', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'throw-new-error': rule}}},
		rules: {'unicorn/throw-new-error': 'error'},
		languageOptions: {parser: typescriptEslintParser},
	};
	const execute = code => {
		const {outputText, diagnostics} = transpileModule(code, {compilerOptions: {target: ScriptTarget.ESNext}, reportDiagnostics: true});
		t.assert.deepStrictEqual(diagnostics, []);
		return runInNewContext(outputText);
	};

	for (const code of [
		'const getErrors = () => ({TypeError}); getErrors()!.TypeError("message").message;',
		'const getTag = () => () => ({TypeError}); getTag()`x`.TypeError("message").message;',
	]) {
		const {output, messages, fixed} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(execute(output), execute(code));
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

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
		// Optional chaining — `new` cannot apply to an optional-chained call
		'throw Error?.()',
		'throw lib?.Error()',
		'throw lib?.foo.Error()',
		// Optional chain in callee even when the call is not the chain's outermost element
		'throw lib?.foo.Error().message',
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

// A tagged template uses the call's return value, `new` produces the constructed instance
test({
	valid: [
		'const a = MyError(\'x\')`y`;',
		'const a = new MyError(\'x\')`y`;',
		'throw MyError(\'x\')`y`;',
	],
	invalid: [],
});

// Error factories return functions, not error instances.
test({
	valid: [
		'class B extends Schema.TaggedError()(\'B\', {message: Schema.String}) {}',
		'class C extends Schema.Error(\'C\')({message: Schema.String}) {}',
		'const factory = CustomError()(options);',
		'const factory = (CustomError())(options);',
	],
	invalid: [
		{
			code: 'consume(CustomError());',
			output: 'consume(new CustomError());',
			errors: [{messageId: 'throw-new-error'}],
		},
		{
			code: 'const message = CustomError().toString();',
			output: 'const message = new CustomError().toString();',
			errors: [{messageId: 'throw-new-error'}],
		},
		{
			code: 'const ErrorClass = CustomError(Error())(TypeError());',
			output: 'const ErrorClass = CustomError(new Error())(new TypeError());',
			errors: [{messageId: 'throw-new-error'}, {messageId: 'throw-new-error'}],
		},
	],
});

test.typescript({
	valid: [
		'class B extends Schema.TaggedError<B>()(\'B\', {message: Schema.String}) {}',
		'class C extends Schema.Error<C>(\'C\')({message: Schema.String}) {}',
		'class B extends RenamedSchema.TaggedError<B>()(\'B\', {message: RenamedSchema.String}) {}',
		'class B extends TaggedError<B>()(\'B\', {message: Schema.String}) {}',
	],
	invalid: [],
});

test({
	valid: [
		typeAware('declare function CustomError(): () => Error; const factory = CustomError();'),
		typeAware('declare function TaggedError<Self>(): new () => Error; const ErrorClass = TaggedError<Error>();'),
		typeAware('declare const Schema: {TaggedError<Self>(): (tag: string, fields: object) => new () => Error}; const defineError = Schema.TaggedError<Error>();'),
	],
	invalid: [
		{
			code: 'function CustomError() {return () => new Error();} const factory = CustomError();',
			output: 'function CustomError() {return () => new Error();} const factory = new CustomError();',
			errors: [{messageId: 'throw-new-error'}],
		},
		{
			code: 'declare function CustomError(): () => Error; const factory = CustomError();',
			output: 'declare function CustomError(): () => Error; const factory = new CustomError();',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'throw-new-error'}],
		},
		{
			...typeAware(outdent`
				declare function CustomError(kind: 'factory'): () => Error;
				declare function CustomError(kind: 'instance'): Error;
				const factory = CustomError('factory');
				const error = CustomError('instance');
			`),
			output: outdent`
				declare function CustomError(kind: 'factory'): () => Error;
				declare function CustomError(kind: 'instance'): Error;
				const factory = CustomError('factory');
				const error = new CustomError('instance');
			`,
			errors: [{messageId: 'throw-new-error', line: 4}],
		},
		...[
			['const error = Error();', 'const error = new Error();'],
			[
				'declare function CustomError(): Error; const error = CustomError();',
				'declare function CustomError(): Error; const error = new CustomError();',
			],
			[
				'declare function CustomError(): any; const error = CustomError();',
				'declare function CustomError(): any; const error = new CustomError();',
			],
			[
				'declare function CustomError(): unknown; const error = CustomError();',
				'declare function CustomError(): unknown; const error = new CustomError();',
			],
			['const error = UnresolvedError();', 'const error = new UnresolvedError();'],
			[
				'declare function CustomError(error: Error): () => Error; const factory = CustomError(TypeError());',
				'declare function CustomError(error: Error): () => Error; const factory = CustomError(new TypeError());',
			],
		].map(([code, output]) => ({
			...typeAware(code),
			output,
			errors: [{messageId: 'throw-new-error'}],
		})),
	],
});
