import {getPropertyName} from '@eslint-community/eslint-utils';
import {isPromiseType} from './utils/index.js';

const MESSAGE_ID = 'prefer-await';
const messages = {
	[MESSAGE_ID]: 'Prefer `await` over promise chaining with `.{{method}}()`.',
};

const promiseMethods = new Set(['then', 'catch', 'finally']);

function isPromiseObject(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		return isPromiseType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
		);
	} catch {
		// TypeScript can throw while resolving incomplete projects; keep this rule best-effort.
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		const {callee} = callExpression;
		if (callee.type !== 'MemberExpression') {
			return;
		}

		const method = getPropertyName(callee, context.sourceCode.getScope(callExpression));
		if (!promiseMethods.has(method)) {
			return;
		}

		const promiseObject = isPromiseObject(callee.object, context);
		if (promiseObject === false) {
			return;
		}

		return {
			node: callee.property,
			messageId: MESSAGE_ID,
			data: {method},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `await` over promise chaining.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
