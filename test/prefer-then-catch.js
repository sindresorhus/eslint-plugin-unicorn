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
		'promise.then();',
		'promise.then(onFulfilled);',
		'promise.then(onFulfilled, onRejected, extraArgument);',
		'promise.then(undefined, onRejected);',
		'promise.then(null, onRejected);',
		'promise.then(void 0, onRejected);',
		'promise.then(onFulfilled, undefined);',
		'promise.then(onFulfilled, null);',
		'promise.then(onFulfilled, void 0);',
		'promise.then(...handlers, onRejected);',
		'promise.then(onFulfilled, ...handlers);',
		'promise["then"](onFulfilled, onRejected);',
		'promise?.then(onFulfilled, onRejected);',
		'promise.then?.(onFulfilled, onRejected);',
		typeAware(outdent`
			declare const object: {then(onFulfilled: () => void, onRejected: () => void): void};
			object.then(onFulfilled, onRejected);
		`),
		typeAware(outdent`
			declare const promise: PromiseLike<string>;
			promise.then(onFulfilled, onRejected);
		`),
		typeAware(outdent`
			declare const thenable: PromiseLike<string> & {catch(onRejected: () => void): void};
			thenable.then(onFulfilled, onRejected);
		`),
		typeAware(outdent`
			declare const thenable: {
				then(onFulfilled: (value: string) => void, onRejected: (reason: unknown) => void): {catch: string};
			};
			thenable.then(onFulfilled, onRejected);
		`),
		typeAware(outdent`
			type Thenable = {then(onFulfilled: () => void, onRejected: () => void): void};
			declare const value: Promise<void> | Thenable;
			value.then(onFulfilled, onRejected);
		`),
		typeAware(outdent`
			interface Promise<T> {
				then(onFulfilled: (value: T) => void, onRejected: (reason: unknown) => void): void;
			}
			declare const promise: Promise<string>;
			promise.then(onFulfilled, onRejected);
		`),
		typeAware(outdent`
			interface Promise<T> {
				then(onFulfilled: (value: T) => void, onRejected: (reason: unknown) => void): Promise<void> | undefined;
			}
			declare const promise: Promise<string>;
			promise.then(onFulfilled, onRejected);
		`),
		{
			code: 'promise.then(onFulfilled, undefined as (error: unknown) => void);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'promise.then(null!, onRejected);',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'promise.then(onFulfilled, onRejected);',
		'promise.then(onFulfilled, function onRejected() {});',
		typeAware(outdent`
			declare const value: any;
			value.then(onFulfilled, onRejected);
		`),
		'function handlePromise(undefined) { promise.then(onFulfilled, undefined); }',
		'Promise.resolve(value).then(onFulfilled, onRejected);',
		'void promise.then(onFulfilled, onRejected);',
		'promise.then(onFulfilled, onRejected,);',
		'promise.then(onFulfilled, (onRejected));',
		outdent`
			promise
				.then(
					onFulfilled,
					onRejected,
				)
				.then(next);
		`,
		{
			code: 'promise.then(onFulfilled, onRejected as (error: unknown) => void);',
			languageOptions: {parser: parsers.typescript},
		},
		'promise.then(onFulfilled, error => { /* Keep this comment. */ handle(error); });',
		'promise.then(onFulfilled, createRejectionHandler());',
		'promise.then(onFulfilled, handlers.onRejected);',
		'promise.then(onFulfilled, tag`handler`);',
		'promise.then(onFulfilled, [...handlers]);',
		'promise.then(onFulfilled, {...handlers});',
		'promise.then(onFulfilled, /* Do not move this comment. */ onRejected);',
		'promise.then(onFulfilled, onRejected /* Do not move this comment. */);',
		'promise.then(onFulfilled, onRejected, /* Do not move this comment. */);',
		typeAware(outdent`
			declare const promise: Promise<string>;
			promise.then(onFulfilled, onRejected);
		`),
	],
});
