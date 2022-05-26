'use strict';
const { ReferenceTracker } = require("eslint-utils");
const builtins = require('./utils/builtins.js');
const isShadowed = require('./utils/is-shadowed.js');
const {callExpressionSelector, newExpressionSelector} = require('./selectors/index.js');
const {
	switchCallExpressionToNewExpression,
	switchNewExpressionToCallExpression,
} = require('./fix/index.js');

const messages = {
	enforce: 'Use `new {{name}}()` instead of `{{name}}()`.',
	disallow: 'Use `{{name}}()` instead of `new {{name}}()`.',
};

function * enforceNewExpression({sourceCode, tracker}) {
	const traceMap = Object.fromEntries(
		builtins.enforceNew.map(name => [name, {[ReferenceTracker.CALL]: true}])
	)

	for (const {node} of tracker.iterateGlobalReferences(traceMap)) {
		const {callee, parent} = node;
		const {name} = callee;

		if (
			name === 'Object'
			&& parent
			&& parent.type === 'BinaryExpression'
			&& (parent.operator === '===' || parent.operator === '!==')
			&& (parent.left === node || parent.right === node)
		) {
			continue;
		}

		yield {
			node,
			messageId: 'enforce',
			data: {name},
			fix: fixer => switchCallExpressionToNewExpression(node, sourceCode, fixer),
		};
	}
}

function * enforceCallExpression({sourceCode, tracker}) {
	const traceMap = Object.fromEntries(
		builtins.disallowNew.map(name => [name, {[ReferenceTracker.CONSTRUCT]: true}])
	)

	for (const {node} of tracker.iterateGlobalReferences(traceMap)) {
		const {callee} = node;

		const {name} = callee;
		const problem = {
			node,
			messageId: 'disallow',
			data: {name},
		};

		if (name !== 'String' && name !== 'Boolean' && name !== 'Number') {
			problem.fix = function * (fixer) {
				yield * switchNewExpressionToCallExpression(node, sourceCode, fixer);
			};
		}

		yield problem;
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		* 'Program:exit'() {
			const sourceCode = context.getSourceCode();
			const tracker = new ReferenceTracker(context.getScope());

			yield * enforceNewExpression({sourceCode, tracker});
			yield * enforceCallExpression({sourceCode, tracker});
		}
	}
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the use of `new` for all builtins, except `String`, `Number`, `Boolean`, `Symbol` and `BigInt`.',
		},
		fixable: 'code',
		messages,
	},
};
