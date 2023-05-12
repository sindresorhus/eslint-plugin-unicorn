'use strict';
const {methodCallSelector} = require('./selectors/index.js');
const {isStaticRequire} = require('./ast/index.js')

const MESSAGE_ID = 'no-process-exit';
const messages = {
	[MESSAGE_ID]: 'Only use `process.exit()` in CLI apps. Throw an error instead.',
};

const processOnOrOnceCallSelector = methodCallSelector({
	object: 'process',
	methods: ['on', 'once'],
	minimumArguments: 1,
});
const processExitCallSelector = methodCallSelector({
	object: 'process',
	method: 'exit',
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const startsWithHashBang = context.sourceCode.lines[0].indexOf('#!') === 0;

	if (startsWithHashBang) {
		return {};
	}

	let processEventHandler;

	// Only report if it's outside an worker thread context. See #328.
	let requiredWorkerThreadsModule = false;
	const problemNodes = [];

	return {
		CallExpression(callExpression) {
			// `require('worker_threads')`
			if (
				isStaticRequire(callExpression)
				// TODO: Support `node:worker_threads`
				&& callExpression.arguments[0].value === 'worker_threads'
			) {
				requiredWorkerThreadsModule = true;
			}
		},
		// `import workerThreads from 'worker_threads'`
		ImportDeclaration(importDeclaration) {
			// `import workerThreads from 'worker_threads'`
			if (
				importDeclaration.source.type === 'Literal'
				// TODO: Support `node:worker_threads`
				&& importDeclaration.source.value === 'worker_threads'
			) {
				requiredWorkerThreadsModule = true;
			}
		}
		// Check `process.on` / `process.once` call
		[processOnOrOnceCallSelector](node) {
			processEventHandler = node;
		},
		// Check `process.exit` call
		[processExitCallSelector](node) {
			if (!processEventHandler) {
				problemNodes.push(node);
			}
		},
		'CallExpression:exit'(node) {
			if (node === processEventHandler) {
				processEventHandler = undefined;
			}
		},
		* 'Program:exit'() {
			if (!requiredWorkerThreadsModule) {
				for (const node of problemNodes) {
					yield {
						node,
						messageId: MESSAGE_ID,
					};
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `process.exit()`.',
		},
		messages,
	},
};
