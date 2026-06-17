import {getPropertyName} from '@eslint-community/eslint-utils';
import {isPromiseType} from './utils/index.js';

const MESSAGE_ID = 'prefer-await';
const messages = {
	[MESSAGE_ID]: 'Prefer `await` over promise chaining with `.{{method}}()`.',
};

const promiseMethods = new Set(['then', 'catch', 'finally']);

// Climb from a chained method call to the outermost call of its `.a().b().c()` chain.
function getOutermostChainCall(node) {
	let current = node;
	while (
		current.parent.type === 'MemberExpression'
		&& current.parent.object === current
		&& current.parent.parent.type === 'CallExpression'
		&& current.parent.parent.callee === current.parent
	) {
		current = current.parent.parent;
	}

	return current;
}

// `void promise.then(…)` is the idiomatic opt-out for intentional fire-and-forget.
function isVoidDiscarded(callExpression) {
	let {parent} = getOutermostChainCall(callExpression);
	if (parent.type === 'ChainExpression') {
		parent = parent.parent;
	}

	return parent.type === 'UnaryExpression' && parent.operator === 'void';
}

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

		if (isVoidDiscarded(callExpression)) {
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
