import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Object.assign(error, {notNameNotStack})',
		'Object.assign(error, {message})',
		'Object.assign(new Error(), {message})',
		'Object.assign(new Error(), {code})',
		'Object.assign(new AggregateError([], "message"), {nameOfError})',
		'Object.assign(new Error(), {errors})',
		'Object.assign(new TypeError(), source)',
		'Object.assign(new TypeError(), {...source})',
		'Object.assign?.(new TypeError(), {name})',
		'NotObject.assign(new TypeError(), {name})',
		'const error = getError(); error.name = name;',
		'const error = new Error(); Object.assign(error, {message});',
		'const error = new Error(); error.message = message;',
		'const error = new TypeError(); error.errors = errors;',
		'const error = new Error(); error[computed] = name;',
		'const error = new Error(); error["mess" + "age"] = message;',
		'const error = new Error(); error.name;',
		'const error = new Error(); delete error.name;',
		'new AggregateError([], "message").name;',
		'error = new Error(); error.name = name;',
		outdent`
			const Error = function () {};
			const error = new Error();
			error.name = name;
		`,
		outdent`
			const AggregateError = function () {};
			Object.assign(new AggregateError(), {errors});
		`,
		outdent`
			const TypeError = function () {};
			const error = new TypeError();
			error.name = name;
		`,
		outdent`
			const {error} = object;
			error.name = name;
		`,
		outdent`
			const Object = {assign() {}};
			Object.assign(new Error(), {name});
		`,
		outdent`
			const error = new Error();
			error = {};
			error.name = name;
		`,
		outdent`
			var error = new Error();
			var error = {};
			error.name = name;
		`,
		outdent`
			var error = new Error();
			{
				var error = {};
			}
			error.name = name;
		`,
		outdent`
			var error = new Error();
			{
				error = {};
			}
			error.name = name;
		`,
		outdent`
			let error = new Error();
			{
				error = {};
			}
			error.name = name;
		`,
		outdent`
			let error = new AggregateError([]);
			{
				error = new Error();
			}
			error.errors = errors;
		`,
		outdent`
			let error = new AggregateError([]);
			{
				error = new Error();
			}
			Object.assign(error, {errors});
		`,
		outdent`
			let error = new Error();
			if (condition) {
				error = {};
			}
			error.name = name;
		`,
		outdent`
			let error = new Error();
			if (condition) error = {};
			error.name = name;
		`,
		outdent`
			var error = new Error();
			if (condition) {
				var error = {};
			}
			error.name = name;
		`,
		outdent`
			if (condition) {
				var error = new Error();
			}
			error.name = name;
		`,
		outdent`
			let error = new AggregateError([]);
			switch (kind) {
				case 'error':
					error = new Error();
			}
			error.errors = errors;
		`,
		outdent`
			let error;
			if (condition) {
				error = new Error();
			}
			error.name = name;
		`,
		outdent`
			let error;
			if (condition) error = new Error();
			error.name = name;
		`,
		outdent`
			let error = {};
			if (condition) {
				error = new Error();
			}
			error.name = name;
		`,
		outdent`
			let error;
			function setup() {
				error = new Error();
			}
			error.name = name;
		`,
		outdent`
			class CustomError extends Error {
				constructor() {
					super();
					this.name = 'CustomError';
				}
			}
		`,
	],
	invalid: [
		'Object.assign(new Error(), {name})',
		'Object.assign(Error(), {stack})',
		'Object.assign(new TypeError(), {cause})',
		'Object.assign(new AggregateError([], "message"), {errors})',
		'Object.assign(new AggregateError([], "message"), {name, stack, cause, errors})',
		'Object.assign(new Error(), {code}, {name})',
		'Object.assign(new Error(), {"stack": stack})',
		'Object.assign(new Error(), {["cause"]: cause})',
		'Object.assign(new Error(), {[`cause`]: cause})',
		'Object.assign(new Error(), {name() {}})',
		outdent`
			const error = new Error();
			Object.assign(error, {name});
		`,
		outdent`
			let error;
			error = new TypeError();
			Object.assign(error, {'stack': stack});
		`,
		outdent`
			const error = new Error();
			error.name = 'Custom';
		`,
		outdent`
			let error;
			error = new TypeError();
			error.stack = stack;
		`,
		outdent`
			const error = new Error();
			error['name'] = name;
		`,
		outdent`
			if (condition) {
				const error = new Error();
				error.name = name;
			}
		`,
		outdent`
			let error;
			if (condition) {
				error = new Error();
				error.name = name;
			}
		`,
		outdent`
			let error;
			if (condition) {
				{
					error = new Error();
				}
				error.name = name;
			}
		`,
		outdent`
			let error;
			function setup() {
				error = new Error();
				error.name = name;
			}
		`,
		outdent`
			if (condition) {
				var error = new Error();
				error.name = name;
			}
		`,
		outdent`
			if (condition) {
				{
					var error = new Error();
				}
				error.name = name;
			}
		`,
		outdent`
			{
				var error = new Error();
			}
			error.name = name;
		`,
		outdent`
			let error;
			{
				error = new Error();
			}
			error.name = name;
		`,
		outdent`
			switch (kind) {
				case 'error':
					const error = new Error();
					error.name = name;
			}
		`,
		outdent`
			let error;
			switch (kind) {
				case 'error':
					{
						error = new Error();
					}
					error.name = name;
			}
		`,
		outdent`
			for (const error = new Error(); condition;) {
				error.name = name;
			}
		`,
		outdent`
			for (const error = new AggregateError([]); condition;) {
				error.errors = errors;
			}
		`,
		outdent`
			let error;
			for (error = new Error(); condition;) {
				error.name = name;
			}
		`,
		outdent`
			let error = new Error();
			{
				error = new AggregateError([]);
			}
			error.errors = errors;
		`,
		outdent`
			let error = new Error();
			{
				error = new AggregateError([]);
			}
			Object.assign(error, {errors});
		`,
		'new Error().stack = stack',
		'Error().cause = cause',
		'new AggregateError([], "message").errors = errors',
		'new Error()[`stack`] = stack',
		outdent`
			function setup() {
				const error = new Error();
				error.name = name;
			}
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [],
	invalid: [
		outdent`
			const error = new Error() as Error;
			error.name = 'Custom';
		`,
		'(new Error() as Error).stack = stack',
		'Object.assign(new Error() as Error, {name})',
		'Object.assign(new AggregateError([], "message") satisfies AggregateError, {errors})',

		// `++` and `--` write the property as well
		'const error = new Error(); error.name++;',
		'const error = new Error(); ++error.name;',
		'const error = new Error(); error.name--;',
	],
});

// A reassignment inside a nested function may run before the outer value is read
test({
	valid: [
		...[
			'let error = new Error(\'a\');\nfunction setup() {\n\terror = {};\n}\nerror.name = name;',
			'let error = new Error(\'a\');\nfunction setup() {\n\terror = null;\n}\nerror.name = name;',
			'let error = new Error(\'a\');\nconst setup = () => error = {};\nerror.name = name;',
			// A reassignment inside an expression makes the value unknown too
			'let error = new Error(\'a\');\nfoo(error = {});\nerror.name = name;',
			'let error = new Error(\'a\');\ncondition && (error = {});\nerror.name = name;',
			'let error = new Error(\'a\');\nconst other = error = {};\nerror.name = name;',
		].map(code => ({code})),
	],
	invalid: [
		// Reassigning to another built-in error keeps it a built-in error
		...[
			'let error = new Error(\'a\');\nfunction setup() {\n\terror = new TypeError();\n}\nerror.name = name;',
		].map(code => ({code, errors: 1})),
	],
});

test({
	valid: [
		// Destructuring, `for-of`, and `++` writes can replace the error with a plain object
		'let e = new Error(\'m\'); [e] = [{}]; e.name = \'x\';',
		'let e = new Error(); ({e} = {e: {}}); e.name = \'x\';',
		'let e = new Error(); for (e of [{}]) {} e.name = \'x\';',
		'let e = new Error(); e++; e.name = \'x\';',
		'let e = new Error(); for (e in {a: 1}) {} e.name = \'x\';',
		// Rest elements, defaults, and nested patterns write the variable too
		'let e = new Error(); [...e] = [{}]; e.name = \'x\';',
		'let e = new Error(); ({...e} = {}); e.name = \'x\';',
		'let e = new Error(); [e = 1] = [{}]; e.name = \'x\';',
		'let e = new Error(); ({e = 1} = {}); e.name = \'x\';',
		'let e = new Error(); [, [e]] = [1, [{}]]; e.name = \'x\';',
		'let e = new Error(); ({a: {b: e}} = {a: {b: {}}}); e.name = \'x\';',
		// A write that may run makes the value unknown
		'let e = new Error(); if (condition) { [e] = [{}]; } e.name = \'x\';',
		'let e = new Error(); function setup() { [e] = [{}]; } e.name = \'x\';',
		'let e = new Error(); { for (e of [{}]) {} } e.name = \'x\';',
		// A `var` loop binding redeclares the same variable
		'var e = new Error(); for (var e of [{}]) { e.name = \'x\'; }',
		'var e = new Error(); for (var [e] in {a: 1}) {} e.name = \'x\';',
	],
	invalid: [
		// A destructuring that does not write the error keeps it known
		...[
			'let e = new Error(); let other; [other] = [{}]; e.name = \'x\';',
			'let e = new Error(); [object.property] = [{}]; e.name = \'x\';',
			'let e = new Error(); for (const e of [{}]) {} e.name = \'x\';',
			// A later plain assignment makes it known again
			'let e; [e] = [{}]; e = new Error(); e.name = \'x\';',
		].map(code => ({code, errors: 1})),
	],
});

// A loop target is written after the iterable expression runs, so the error is still known there
test({
	valid: [],
	invalid: [
		{
			code: 'let error = new Error(); for (error of (error.name = "Rhs", [{}])) { error.name = "Body"; } error.name = "After";',
			errors: 1,
		},
		{
			code: 'var error = new Error(); for (var error in (Object.assign(error, {name: "Rhs"}), {key: 1})) { error.name = "Body"; }',
			errors: 1,
		},
		{
			code: 'let error = new Error(); for ([error] of (error.name++, [[{}]])) { error.name = "Body"; }',
			errors: 1,
		},
		// Another loop target keeps the error known in the body
		{
			code: 'let error = new Error(); let other; for (other of (error.name = "Rhs", [{}])) { error.name = "Body"; }',
			errors: 2,
		},
		{
			code: 'let error = new Error(); for (error! of ((<Error>error).name = "Rhs", [{}])) { error.name = "Body"; }',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

test({
	valid: [
		// TypeScript assertions around the written variable still write it
		{
			code: 'let e = new Error(); e!++; e.name = \'x\';',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let e = new Error(); (e as any) = {}; e.name = \'x\';',
			languageOptions: {parser: parsers.typescript},
		},
		// Assertions inside a destructuring pattern still write the variable
		{
			code: 'let e = new Error(); [e!] = [{}]; e.name = \'x\';',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let e = new Error(); ({a: e as any} = {a: {}}); e.name = \'x\';',
			languageOptions: {parser: parsers.typescript},
		},
		...[
			'let e = new Error(); [...(e as any)] = [{}]; e.name = \'x\';',
			'let e = new Error(); [(e satisfies any) = 1] = [{}]; e.name = \'x\';',
			'let e = new Error(); for (e! of [{}]) {} e.name = \'x\';',
			'let e = new Error(); (<any>e)++; e.name = \'x\';',
			'let e = new Error(); (e as any) += 1; e.name = \'x\';',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		// An assertion around the target does not hide a reassignment to another built-in error
		{
			code: 'let e = new Error(); (e as any) = new TypeError(); e.name = \'x\';',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});
