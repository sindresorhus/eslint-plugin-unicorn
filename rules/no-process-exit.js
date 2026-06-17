import {isStaticRequire, isMethodCall, isLiteral} from './ast/index.js';

const MESSAGE_ID = 'no-process-exit';
const messages = {
	[MESSAGE_ID]: 'Only use `process.exit()` in CLI apps. Throw an error instead.',
};

const isWorkerThreads = node =>
	isLiteral(node, 'node:worker_threads')
	|| isLiteral(node, 'worker_threads');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const startsWithHashBang = context.sourceCode.lines[0].indexOf('#!') === 0;

	if (startsWithHashBang) {
		return;
	}

	// Track how many `process.on`/`process.once` handler calls we're currently inside.
	// A counter (not a single node) is needed so a nested/sibling handler doesn't end the enclosing context.
	let processEventHandlerDepth = 0;

	// Only report if it's outside a worker thread context. See #328.
	let requiredWorkerThreadsModule = false;
	const problemNodes = [];

	const isProcessEventHandler = node => isMethodCall(node, {
		object: 'process',
		methods: ['on', 'once'],
		minimumArguments: 1,
		optionalCall: false,
		optionalMember: false,
	});

	// `require('worker_threads')`
	context.on('CallExpression', callExpression => {
		if (
			isStaticRequire(callExpression)
			&& isWorkerThreads(callExpression.arguments[0])
		) {
			requiredWorkerThreadsModule = true;
		}
	});

	// `import workerThreads from 'worker_threads'`
	context.on('ImportDeclaration', importDeclaration => {
		if (
			importDeclaration.source.type === 'Literal'
			&& isWorkerThreads(importDeclaration.source)
		) {
			requiredWorkerThreadsModule = true;
		}
	});

	// Check `process.on` / `process.once` call
	context.on('CallExpression', node => {
		if (isProcessEventHandler(node)) {
			processEventHandlerDepth++;
		}
	});
	context.onExit('CallExpression', node => {
		if (isProcessEventHandler(node)) {
			processEventHandlerDepth--;
		}
	});

	// Check `process.exit` call
	context.on('CallExpression', node => {
		if (
			processEventHandlerDepth === 0
			&& isMethodCall(node, {
				object: 'process',
				method: 'exit',
				optionalCall: false,
				optionalMember: false,
			})
		) {
			problemNodes.push(node);
		}
	});

	context.onExit('Program', function * () {
		if (requiredWorkerThreadsModule) {
			return;
		}

		for (const node of problemNodes) {
			yield {
				node,
				messageId: MESSAGE_ID,
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `process.exit()`.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
