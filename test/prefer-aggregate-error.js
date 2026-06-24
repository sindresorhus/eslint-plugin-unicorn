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
	],
});
