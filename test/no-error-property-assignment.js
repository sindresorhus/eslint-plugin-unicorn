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
	],
});
