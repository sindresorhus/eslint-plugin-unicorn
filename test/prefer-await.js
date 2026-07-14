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
		{
			code: 'void (promise.then(callback) as Promise<void>);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function foo(object: {then(): void}) { object.then(); }'),
		typeAware('function foo(object: {catch(handler: () => void): void}) { object.catch(() => {}); }'),
		typeAware('function foo(object: {finally(handler: () => void): void}) { object.finally(() => {}); }'),
	],
	invalid: [
		'promise.then(callback);',
		'promise.then(() => {});',
		'promise.then(() => doSomething());',
		'promise.then(value => transform(value));',
		'promise.then(async value => await transform(value));',
		'promise.then(value => ({await: value}));',
		'promise.then(value => { transform(value); });',
		outdent`
			if (condition) {
				promise.then(value => {
					// Keep this comment.
					transform(value);
				});
			}
		`,
		outdent`
			if (condition) {
			  promise.then(value => {
			    // Keep this space-indented comment.
			    transform(value);
			  });
			}
		`,
		outdent`
			if (condition) {
			  promise.then(value => transform(value));
			}
		`,
		outdent`
			promise.then(value => {
				value = transform(value);
				return value;
			});
		`,
		'(condition ? promise : otherPromise).then(value => transform(value));',
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
		'promise.then(onFulfilled).then(value => transform(value));',
		'promise.then(onFulfilled).catch(onRejected).finally(onFinally);',
		'value.then(value => transform(value));',
		'if (condition) promise.then(value => transform(value));',
		'const result = promise.then(value => transform(value));',
		'promise.then(function (value) { return transform(value); });',
		'promise.then(({value}) => transform(value));',
		'promise.then((value = fallback) => transform(value));',
		'promise.then((...values) => transform(values));',
		'promise.then((value, index) => transform(value, index));',
		'promise.then(value => { var value; return value; });',
		'promise.then(value => { function value() {} return value; });',
		'getPromise(value).then(value => transform(value));',
		'promise.then(() => { const promise = otherPromise; return promise; });',
		'promise.then(() => { var promise; return promise; });',
		'promise.then(() => { function promise() {} return promise; });',
		'promise.then(value => { "use strict"; return transform(value); });',
		'promise /* keep */.then(value => transform(value));',
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
		outdent`
			async function run() {
				getPromise(await dependency).then(value => transform(value));
			}
		`,
		outdent`
			function * run() {
				getPromise(yield dependency).then(value => transform(value));
			}
		`,
		{
			code: 'function foo(value: any) { value.catch(() => {}); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'promise.then(<Type>(value: Type) => value);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'promise.then((value): string => value);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'promise.then(await => await);',
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		{
			code: 'promise.then(await => await);',
			languageOptions: {sourceType: 'commonjs'},
		},
		{
			code: 'promise.then(() => await);',
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		{
			code: 'promise.then(() => { var await; return await; });',
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		{
			code: 'getPromise(await).then(value => transform(value));',
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		{
			code: 'promise.then(() => { await: doSomething(); });',
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		{
			code: 'promise.then(let => let);',
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		typeAware('function foo(promise: Promise<string>) { promise.then(value => value); }'),
		typeAware(outdent`
			function foo(promise: Promise<string>) {
				promise.then((value: string) => value);
			}
		`),
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
