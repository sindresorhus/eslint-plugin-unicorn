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

test({
	valid: [],
	invalid: [
		'declare const target: MessagePort | {postMessage: Function}; target.postMessage("ping")',
		'declare const target: MessagePort | {postMessage: {}}; target.postMessage("ping")',
	].map(code => ({
		...typeAware(code),
		errors: [{messageId: 'error', suggestions: 3}],
	})),
});

test.snapshot({
	valid: [
		'window.postMessage(message, targetOrigin)',
		'postMessage(message)',
		'window.postMessage',
		'window.postMessage()',
		'window.postMessage(message, targetOrigin, transfer)',
		'window.postMessage(...message)',
		'window[postMessage](message)',
		'window["postMessage"](message)',
		'window.notPostMessage(message)',
		'window.postMessage?.(message)',
		typeAware('declare const parentPort: {postMessage(value: unknown, transferList?: readonly unknown[]): void} | null; parentPort!.postMessage("done")'),
		typeAware('new Worker("./worker.js").postMessage("start")'),
		typeAware('new MessageChannel().port1.postMessage("ping")'),
		typeAware('new BroadcastChannel("updates").postMessage("ping")'),
		typeAware('declare const port: {postMessage(message: unknown): void}; port.postMessage("ping")'),
		typeAware('declare const port: MessagePort | undefined; port?.postMessage("ping")'),
		typeAware('declare const target: MessagePort | BroadcastChannel; target.postMessage("ping")'),
		typeAware('function send<T extends MessagePort>(target: T) {target.postMessage("ping")}'),
		typeAware('declare const target: unknown; (target as MessagePort).postMessage("ping")'),
	],
	invalid: [
		'window.postMessage(message)',
		'self.postMessage(message)',
		'globalThis.postMessage(message)',
		'foo.postMessage(message )',
		'foo?.postMessage(message )',
		'foo.postMessage( ((message)) )',
		'foo.postMessage(message,)',
		'foo.postMessage(message , )',
		'foo.window.postMessage(message)',
		'document.defaultView.postMessage(message)',
		'getWindow().postMessage(message)',
		{code: 'declare const port: MessagePort; port.postMessage("ping")', languageOptions: {parser: parsers.typescript}},
		typeAware('window.postMessage("ping")'),
		typeAware('declare const iframe: HTMLIFrameElement; iframe.contentWindow!.postMessage("ping")'),
		typeAware('declare const target: any; target.postMessage("ping")'),
		typeAware('declare const target: {postMessage: any}; target.postMessage("ping")'),
		typeAware('declare const target: {postMessage(message: unknown): void; postMessage(message: unknown, targetOrigin: string): void}; target.postMessage("ping")'),
		typeAware('declare const target: Window | undefined; target?.postMessage("ping")'),
		typeAware('declare const target: Window | MessagePort; target.postMessage("ping")'),
		typeAware('function send<T extends Window>(target: T) {target.postMessage("ping")}'),
		typeAware('declare const target: unknown; (target as Window).postMessage("ping")'),
		typeAware('declare const target: {location: Location; postMessage(message: unknown, targetOrigin?: string): void}; target.postMessage("ping")'),
	],
});
