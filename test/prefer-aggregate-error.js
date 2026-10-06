import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const typescript = code => ({
	code,
	languageOptions: {parser: parsers.typescript},
});

test.snapshot({
	valid: [
		'if (errors.length > 0) { throw new AggregateError(errors, "Failed."); }',
		'if (items.length > 0) { throw new Error("Failed."); }',
		'if (errorMessages.length > 0) { throw new Error("Failed."); }',
		'if (errors.length === 0) { throw new Error("Failed."); }',
		'if (!errors.length) { throw new Error("Failed."); }',
		'if (errors.length > 0 || hasWarnings) { throw new Error("Failed."); }',
		'if (errors.length > 0 && warnings.length > 0) { throw new Error("Failed."); }',
		'const errors = []; const validationErrors = []; if (errors.length > 0 && validationErrors.length > 0) { throw new Error("Failed."); }',
		'const errors = []; if (errors.length) { throw new Error(); }',
		String.raw`const errors = ["Name is required"]; if (errors.length > 0) { throw new Error(errors.join("\n")); }`,
		'const errors = [new Error("One failed."), "Name is required"]; if (errors.length > 0) { throw new Error("Failed."); }',
		'const errors = [new Error("One failed."), ,]; if (errors.length > 0) { throw new Error("Failed."); }',
		String.raw`const errors = []; errors.push("Name is required"); if (errors.length > 0) { throw new Error(errors.join("\n")); }`,
		'const errors = []; errors.push(new Error("One failed.")); if (errors.length > 0) { throw new Error("Failed."); }',
		'const errors = []; function collect() { errors.push(new Error("One failed.")); } if (errors.length > 0) { throw new Error("Failed."); }',
		'const errors = [new Error("One failed.")]; errors.push("Name is required"); if (errors.length > 0) { throw new Error("Failed."); }',
		'if (errors.length > 0) { log(errors); throw new Error("Failed."); }',
		'if (errors.length > 0) { throw new CustomError("Failed."); }',
		'if (errors.length > 0) { throw Error("Failed."); }',
		typescript('const errors: Error[] = [new Error("One failed.")]; if (errors.length > 0) { throw new Error(...arguments); }'),
		typescript('const Error = CustomError; const errors: Error[] = [new globalThis.Error("One failed.")]; if (errors.length > 0) { throw new Error("Failed."); }'),
		typescript('const AggregateError = CustomAggregateError; const errors: Error[] = [new Error("One failed.")]; if (errors.length > 0) { throw new Error("Failed."); }'),
		'const errors = {}; if (errors.length > 0) { throw new Error("Failed."); }',
		'let errors = []; if (errors.length > 0) { throw new Error("Failed."); }',
		typescript('type Errors = string[]; function foo(errors: Errors) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: [string]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: string[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Array<string>) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: (Error | string)[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('type Error = string; function foo(errors: Error[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('class TypeError {}; function foo(errors: TypeError[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('class ValidationError extends Error {} function foo(errors: ValidationError[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Error[], validationErrors: Error[]) { if (errors.length > 0 && validationErrors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(failures: Error[]) { if (failures.length > 0) { throw new Error("Failed."); } }'),
		typeAware('export {}; type Error = string; function foo(errors: Error[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typeAware('export {}; class TypeError {}; function foo(errors: TypeError[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typeAware('declare const errorMessages: Error[]; if (errorMessages.length > 0) { throw new Error("Failed."); }'),
		typescript('function foo(errors: NS.Error[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('type A = B; type B = A; function foo(errors: A[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('type A = B; type B = A; function foo(errors: A) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: [Error, ...string[]]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Error[]) { if (errors.length > limit) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Error[]) { if (errors.length > "0") { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Error[]) { if (0 <= errors.length) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Error[]) { if (0 > errors.length) { throw new Error("Failed."); } }'),
		typescript('type A = B; type B = A; const errors: A = []; if (errors.length > 0) { throw new Error("Failed."); }'),
		typescript('const errors: Unknown = []; if (errors.length > 0) { throw new Error("Failed."); }'),
		typeAware('interface Errors extends Array<Error> {} declare const errors: Errors; if (errors.length > 0) { throw new Error("Failed."); }'),
		typeAware('class Base {} class A extends Base { a = 1; } class B extends Base { b = 1; } declare function getErrors(): Array<A & B>; const errors = getErrors(); if (errors.length > 0) { throw new Error("Failed."); }'),
	],
	invalid: [
		typescript('const errors: Error[] = [new Error("One failed.")]; if (errors.length) { throw new Error(); }'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (errors.length > 0) { throw new Error("Failed."); }'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (errors.length > 1) { throw new Error("Failed."); }'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (errors.length !== 0) { throw new Error("Failed."); }'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (errors.length >= 1) { throw new Error("Failed."); }'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (errors.length >= 2) { throw new Error("Failed."); }'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (0 < errors.length) { throw new Error("Failed."); }'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (0 !== errors.length) { throw new Error("Failed."); }'),
		typescript('const validationErrors: TypeError[] = [new TypeError("Invalid name.")]; if (validationErrors.length > 0) { throw new Error("Validation failed."); }'),
		typescript('const errorList: RangeError[] = [new RangeError("Out of range.")]; if (errorList.length > 0) { throw new Error("Failed."); }'),
		typescript('type CollectedError = Error; function foo(errors: CollectedError[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: (Error | TypeError)[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: [Error, TypeError]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('const errorArray: TypeError[] = [new TypeError("Invalid name.")]; if (errorArray.length > 0 && shouldThrow) { throw new Error("Failed."); }'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (shouldThrow && errors.length > 0) throw new Error("Failed.");'),
		typescript('const errors: Error[] = [new Error("One failed.")]; if ((errors.length > 0)) { throw new Error("Failed.", {cause}); }'),
		typescript(outdent`
			const errors: Error[] = [new Error('One failed.')];
			if (errors.length > 0) {
				throw new Error(
					'Failed.'
				);
			}
		`),
		typescript('const errors: Error[] = [new Error("One failed.")]; if (errors.length > 0) { throw new Error(/* message */ message); }'),
		// A type named `AggregateError` does not shadow the global
		typescript('type AggregateError = Custom; function foo(errors: Error[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		{
			code: 'function foo(errors: Error[]) { if (errors.length > 0) { throw new Error("Failed."); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(errors: ReadonlyArray<Error>) { if (errors.length > 0) { throw new Error("Failed."); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Errors = Error[]; function foo(validationErrors: Errors) { if (validationErrors.length > 0) { throw new Error("Failed."); } }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare function getErrors(): Error[]; const errors = getErrors(); if (errors.length > 0) { throw new Error("Failed."); }'),
		typeAware('class ValidationError extends Error {} const errors: ValidationError[] = [new ValidationError("Invalid name.")]; if (errors.length > 0) { throw new Error("Failed."); }'),
		typescript('function foo(errors: readonly Error[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: [first: Error, ...rest: TypeError[]]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: SuppressedError[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: (Error & {code: string})[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Error[] | TypeError[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Error[] & {code: string}) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typescript('function foo(errors: Error[]) { if (1 <= errors.length) { throw new Error("Failed."); } }'),
		typeAware('declare function getErrors(): Array<Error | TypeError>; const errors = getErrors(); if (errors.length > 0) { throw new Error("Failed."); }'),
		typeAware('declare function getErrors(): Array<Error & {code: string}>; const errors = getErrors(); if (errors.length > 0) { throw new Error("Failed."); }'),
		typeAware('function foo<T extends Error>(errors: T[]) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typeAware('declare function getErrors(): Error[] | TypeError[]; const errors = getErrors(); if (errors.length > 0) { throw new Error("Failed."); }'),
		typeAware('declare function getErrors(): Error[] & {code: string}; const errors = getErrors(); if (errors.length > 0) { throw new Error("Failed."); }'),
		typeAware('function foo<T extends Error[]>(errors: T) { if (errors.length > 0) { throw new Error("Failed."); } }'),
		typeAware('export {}; declare global { var errors: Error[]; } if (errors.length > 0) { throw new Error("Failed."); }'),
		{
			code: 'function foo(errors: AggregateError[]) { if (errors.length > 0) { throw new Error("Failed."); } }',
			languageOptions: {parser: parsers.typescript, globals: {AggregateError: 'off'}, parserOptions: {lib: ['es5']}},
		},
	],
});

// `errors!.length` and `(errors as Error[]).length` are the same read
test({
	valid: [],
	invalid: [
		...[
			'errors!.length > 0',
			'(errors as Error[]).length > 0',
			'errors.length as number > 0',
		].map(condition => ({
			code: `function f(errors: Error[]) {\n\tif (${condition}) {\n\t\tthrow new Error('Failed.');\n\t}\n}`,
			output: `function f(errors: Error[]) {\n\tif (${condition}) {\n\t\tthrow new AggregateError(errors, 'Failed.');\n\t}\n}`,
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		})),
	],
});

// Shared ancestors in separate union branches are not cycles.
test({
	valid: [
		typeAware('type First = Second; type Second = First; declare const errors: First[]; if (errors.length) { throw new Error(); }'),
		typeAware('class FirstError extends SecondError {} class SecondError extends FirstError {} declare const errors: FirstError[]; if (errors.length) { throw new Error(); }'),
	],
	invalid: [
		'class FirstError extends Error {first = true;} class SecondError extends Error {second = true;}',
		'class BaseError extends Error {} class FirstError extends BaseError {first = true;} class SecondError extends BaseError {second = true;}',
	].map(declarations => ({
		...typeAware(`${declarations} declare function getErrors(): Array<FirstError | SecondError>; const errors = getErrors(); if (errors.length) { throw new Error(); }`),
		output: `${declarations} declare function getErrors(): Array<FirstError | SecondError>; const errors = getErrors(); if (errors.length) { throw new AggregateError(errors); }`,
		errors: 1,
	})),
});

test({
	valid: [],
	invalid: [{
		...typeAware('function foo<First extends Error[], Second extends Error[]>(errors: First | Second) { if (errors.length) { throw new Error(); } }'),
		output: 'function foo<First extends Error[], Second extends Error[]>(errors: First | Second) { if (errors.length) { throw new AggregateError(errors); } }',
		errors: 1,
	}],
});

// Same-named aliases in different scopes do not form a cycle.
test({
	valid: [],
	invalid: [
		'type Issue = Error; type Alias = Issue; { type Issue = Alias; function foo(errors: Issue[]) { if (errors.length) { throw new Error(); } } }',
		'type Values = Error[]; type Alias = Values; { type Values = Alias; function foo(errors: Values) { if (errors.length) { throw new Error(); } } }',
	].map(code => ({
		...typescript(code),
		output: code.replace('new Error()', 'new AggregateError(errors)'),
		errors: 1,
	})),
});
