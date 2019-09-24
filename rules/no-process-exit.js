'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const create = context => {
	const startsWithHashBang = context.getSourceCode().lines[0].indexOf('#!') === 0;

	if (startsWithHashBang) {
		return {};
	}

	let processEventHandler;

	// Only report if it's outside an worker thread context. See #328.
	let requiredWorkerThreadsModule = false;
	const reports = [];

	return {
		CallExpression: node => {
			const {callee} = node;

			if (callee.type === 'Identifier' && callee.name === 'require') {
				const args = node.arguments;

				if (args.length === 0) {
					return;
				}

				const [argument] = args;

				if (argument.type === 'Literal' && argument.value === 'worker_threads') {
					requiredWorkerThreadsModule = true;
					return;
				}
			}

			if (callee.type === 'MemberExpression' && callee.object.name === 'process') {
				if (callee.property.name === 'on' || callee.property.name === 'once') {
					processEventHandler = node;
					return;
				}

				if (callee.property.name === 'exit' && !processEventHandler) {
					reports.push(
						() =>
							context.report({
								node,
								message: 'Only use `process.exit()` in CLI apps. Throw an error instead.'
							})
					);
				}
			}
		},
		'CallExpression:exit': node => {
			if (node === processEventHandler) {
				processEventHandler = undefined;
			}
		},

		ImportDeclaration: node => {
			const {source} = node;

			if (source.type === 'Literal' && source.value === 'worker_threads') {
				requiredWorkerThreadsModule = true;
			}
		},

		'Program:exit': () => {
			if (!requiredWorkerThreadsModule) {
				for (const report of reports) {
					report();
				}
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		}
	}
};
