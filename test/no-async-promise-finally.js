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
		'let cleanup = async () => {}; promise.finally(cleanup);',
		'async function * cleanup() {} promise.finally(cleanup);',
		'const cleanup = async () => {}; promise.finally(...[cleanup]);',
		'import {cleanup} from "./cleanup.js"; promise.finally(cleanup);',
		typeAware('function foo(object: {finally(handler: () => Promise<void>): void}) { object.finally(async () => {}); }'),
	],
	invalid: [
		'promise.finally(async () => {})',
		'promise.finally(async () => cleanup())',
		'promise.finally(async () => { await cleanup(); })',
		'promise.finally(async function () { await cleanup(); })',
		'Promise.resolve(value).finally(async () => cleanup())',
		'new Promise(resolve => resolve()).finally(async () => cleanup())',
		'promise?.finally(async () => {})',
		'promise["finally"](async () => {})',
		'promise[`finally`](async () => {})',
		'const method = "finally"; promise[method](async () => {});',
		'async function cleanup() {} promise.finally(cleanup);',
		'const cleanup = async () => {}; promise.finally(cleanup);',
		{
			code: 'type Callback = () => void; promise.finally((async () => {}) as Callback);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function foo(promise: Promise<string>) { promise.finally(async () => {}); }'),
	],
});
