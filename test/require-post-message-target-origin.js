import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

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
		'window?.postMessage(message)',
	],
	invalid: [
		'window.postMessage(message)',
		'self.postMessage(message)',
		'globalThis.postMessage(message)',
		'foo.postMessage(message )',
		'foo.postMessage( ((message)) )',
		'foo.postMessage(message,)',
		'foo.postMessage(message , )',
		'foo.window.postMessage(message)',
		'document.defaultView.postMessage(message)',
		'getWindow().postMessage(message)',
	],
});
