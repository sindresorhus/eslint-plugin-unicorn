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
		'promise.finally(() => {})',
		'promise.finally(() => cleanup())',
		'promise.finally(function () {})',
		'promise.finally(async function * () {})',
		'promise.finally()',
		'promise.finally(undefined)',
		'promise.finally(cleanup)',
		'promise.finally(object.cleanup)',
		'promise.then(async () => {})',
		'promise.catch(async () => {})',
		'finalizer(async () => {})',
		'promise.notFinally(async () => {})',
		'promise[method](async () => {})',
		'const cleanup = () => {}; promise.finally(cleanup);',
		'let cleanup = async () => {}; cleanup = () => {}; promise.finally(cleanup);',
		'var cleanup = async () => {}; cleanup = () => {}; promise.finally(cleanup);',
		'async function cleanup() {} cleanup = () => {}; promise.finally(cleanup);',
		'async function cleanup() {} promise.finally(cleanup); cleanup = () => {};',
		'const cleanup = async () => {}; const alias = cleanup; promise.finally(alias);',
		'async function * cleanup() {} promise.finally(cleanup);',
		'const cleanup = async function * () {}; promise.finally(cleanup);',
		'let cleanup = async function * () {}; promise.finally(cleanup);',
		'const cleanup = async () => {}; promise.finally(...[cleanup]);',
		'import {cleanup} from "./cleanup.js"; promise.finally(cleanup);',
		typeAware('function foo(object: {finally(handler: () => Promise<void>): void}) { object.finally(async () => {}); }'),
		typeAware('function foo(object: {finally(handler: () => Promise<void>): void}) { const cleanup = async () => {}; object.finally(cleanup); }'),
		{
			code: 'function cleanup(): Promise<void>; function cleanup() { return Promise.resolve(); } promise.finally(cleanup);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function cleanup(): Promise<void>; async function cleanup() {} cleanup = () => Promise.resolve(); promise.finally(cleanup);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'declare function cleanup(): Promise<void>; promise.finally(cleanup);',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'promise.finally(async () => {})',
		'promise.finally(async () => cleanup())',
		'promise.finally(async () => { await cleanup(); })',
		'promise.finally(async function () { await cleanup(); })',
		'Promise.resolve(value).finally(async () => cleanup())',
		'new Promise(resolve => resolve()).finally(async () => cleanup())',
		'promise?.finally(async () => {})',
		'promise.finally?.(async () => {})',
		'promise["finally"](async () => {})',
		'promise[`finally`](async () => {})',
		'const method = "finally"; promise[method](async () => {});',
		'async function cleanup() {} promise.finally(cleanup);',
		'const cleanup = async () => {}; promise.finally(cleanup);',
		'const cleanup = async function () {}; promise.finally(cleanup);',
		{
			code: 'type Callback = () => void; promise.finally((async () => {}) as Callback);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Callback = () => void; const cleanup = (async () => {}) as Callback; promise.finally(cleanup);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function foo(promise: Promise<string>) { promise.finally(async () => {}); }'),
		typeAware('function foo(promise: unknown) { promise.finally(async () => {}); }'),
		'let cleanup = async () => {}; promise.finally(cleanup);',
		'var cleanup = async function () {}; promise.finally(cleanup);',
		{
			code: 'let cleanup = (async () => {}) satisfies (() => Promise<void>); promise.finally(cleanup);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function cleanup(): Promise<void>; async function cleanup() {} promise.finally(cleanup);',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
