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

test.snapshot({
	valid: [
		'await promise;',
		'foo.then;',
		'foo.catch;',
		'foo.finally;',
		'const object = {then() {}};',
		'const object = {catch() {}};',
		'const object = {finally() {}};',
		'then(callback);',
		'catchError(callback);',
		'finallyCallback(callback);',
		'promise[method](callback);',
		// `void` is the idiomatic opt-out for intentional fire-and-forget.
		'void promise.then(callback);',
		'void promise.catch(() => {});',
		'void promise.finally(cleanup);',
		'void body.cancel().catch(() => undefined);',
		'void promise.then(onFulfilled).catch(onRejected);',
		'void promise?.then(callback);',
		typeAware('function foo(object: {then(): void}) { object.then(); }'),
		typeAware('function foo(object: {catch(handler: () => void): void}) { object.catch(() => {}); }'),
		typeAware('function foo(object: {finally(handler: () => void): void}) { object.finally(() => {}); }'),
	],
	invalid: [
		'promise.then(callback);',
		'promise.catch(callback);',
		'promise.finally(callback);',
		'promise["then"](callback);',
		'promise[`then`](callback);',
		'const method = "catch"; promise[method](callback);',
		'promise?.then(callback);',
		'promise.then?.(callback);',
		'await promise.then(callback);',
		'await promise.catch(callback);',
		'await promise.finally(callback);',
		'Promise.resolve(value).then(callback);',
		'Promise.reject(error).catch(callback);',
		'new Promise(resolve => resolve()).finally(callback);',
		'promise.then(onFulfilled, onRejected);',
		'promise.then(onFulfilled).catch(onRejected).finally(onFinally);',
		'function * run() { yield promise.then(callback); }',
		'class Runner { constructor() { promise.then(callback); } }',
		'cy.get("button").then(callback);',
		outdent`
			async function run() {
				return fetch(url)
					.then(response => response.json())
					.catch(error => {
						console.error(error);
					});
			}
		`,
		{
			code: 'function foo(value: any) { value.catch(() => {}); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function foo(promise: Promise<string>) { promise.then(value => value); }'),
		typeAware('function foo(promise: Promise<string>) { promise.catch(error => error); }'),
		typeAware('function foo(promise: Promise<string>) { promise.finally(() => {}); }'),
		typeAware('function foo(promise: Promise<string> | undefined) { promise?.then(value => value); }'),
		typeAware('function foo(promise: Promise<string> | undefined) { promise!.then(value => value); }'),
		typeAware('function foo(promise: PromiseLike<string>) { promise.then(value => value); }'),
		typeAware('function foo<T extends PromiseLike<string>>(promise: T) { promise.then(value => value); }'),
		typeAware('function foo(thenable: {then(handler: (value: string) => void): void}) { thenable.then(value => value); }'),
		typeAware('function foo(value: Missing) { value.then(value => value); }'),
		typeAware('function foo(value: any) { value.catch(() => {}); }'),
	],
});
