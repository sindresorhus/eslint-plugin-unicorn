'use strict';
const { ReferenceTracker } = require("eslint-utils");
const builtins = require('./utils/builtins.js');
const {
	switchCallExpressionToNewExpression,
	switchNewExpressionToCallExpression,
} = require('./fix/index.js');

const messages = {
	enforce: 'Use `new {{path}}()` instead of `{{path}}()`.',
	disallow: 'Use `{{path}}()` instead of `new {{path}}()`.',
};

function * enforceNewExpression({sourceCode, tracker}) {
	const traceMap = Object.fromEntries(
		builtins.enforceNew.map(name => [name, {[ReferenceTracker.CALL]: true}])
	)

	for (const {node, path} of tracker.iterateGlobalReferences(traceMap)) {
		if (path[path.length - 1] === 'Object') {
			const {parent} = node;
			if (
				parent.type === 'BinaryExpression'
				&& (parent.operator === '===' || parent.operator === '!==')
				&& (parent.left === node || parent.right === node)
			) {
				continue;
			}
		}

		yield {
			node,
			messageId: 'enforce',
			data: {path: path.join('.')},
			fix: fixer => switchCallExpressionToNewExpression(node, sourceCode, fixer),
		};
	}
}

function * enforceCallExpression({sourceCode, tracker}) {
	const traceMap = Object.fromEntries(
		builtins.disallowNew.map(name => [name, {[ReferenceTracker.CONSTRUCT]: true}])
	)

	for (const {node, path} of tracker.iterateGlobalReferences(traceMap)) {
		const problem = {
			node,
			messageId: 'disallow',
			data: {path: path.join('.')},
		};

		const name = path[path.length - 1];
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
