'use strict';
const {} = require('./selectors/index.js');
const {} = require('./fix/index.js');
const {getParenthesizedText} = require('./utils/parentheses.js')


const MESSAGE_ID = 'prefer-modern-math-apis';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{description}}`.',
};

const isMathProperty = (node, property) =>
	node.type === 'MemberExpression'
	&& !node.optional
	&& !node.computed
	&& node.object.type === 'Identifier'
	&& node.object.name === 'Math'
	&& node.property.type === 'Identifier'
	&& node.property.name === property;

const isMathMethodCall = (node, method) =>
	node.type === 'CallExpression'
	&& !node.optional
	&& isMathProperty(node.callee, method)
	&& node.arguments.length === 1
	&& node.arguments[0].type !== 'SpreadElement';

// `Math.log(x) * Math.LOG10E` -> `Math.log10(bar)`
// `Math.LOG10E * Math.log(x)` -> `Math.log10(bar)`
function checkLog10Case1(node) {
	if (!(node.type === 'BinaryExpression' && node.operator === '*')) {
		return;
	}

	let mathLogCall;
	let description;
	if (isMathMethodCall(node.right, 'log') && isMathProperty(node.left, 'LOG10E')) {
		mathLogCall = node.left;
		description = 'Math.log(…) * Math.LOG10E';
	} else if (isMathMethodCall(node.left, 'log') && isMathProperty(node.right, 'LOG10E')) {
		description = 'Math.LOG10E * Math.log(…)';
		mathLogCall = node.right;
	}

	if (!mathLogCall) {
		return;
	}

	const [valueNode] = mathLogCall.arguments;

	return {
		node,
		messageId: MESSAGE_ID,
		data: {
			replacement: 'Math.log10(…)',
			description,
		},
		fix: fixer => fixer.replaceText(node, `Math.log10${getParenthesizedText(valueNode, context.getSourceCode())}`)
	}
}

// `Math.log(x) / Math.LN10` -> `Math.log10(bar)`
function checkLog10Case2(node) {
	if (
		!(
			node.type === 'BinaryExpression'
			&& node.operator === '/'
			&& isMathMethodCall(node.left, 'log')
			&& isMathProperty(node.right, 'LN10')
		)
	) {
		return;
	}


	const [valueNode] = node.left.arguments;

	return {
		node,
		messageId: MESSAGE_ID,
		data: {
			replacement: 'Math.log10(…)',
			description: 'Math.log(…) / Math.LN10',
		},
		fix: fixer => fixer.replaceText(node, `Math.log10${getParenthesizedText(node, context.getSourceCode())}`)
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const nodes = [];
	const checkFunctions = [
		checkLog10Case1,
		checkLog10Case2,
	];

	return {
		BinaryExpression(node) {
			nodes.push(node);
		}
		* 'Program:exit'() {
			for (const node of nodes) {
				for (const getProblem of checkFunctions) {
					const problem = getProblem(node, context);

					if (problem) {
						yield problem;
					}
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
			description: 'Prefer modern `Math` apis.',
		},
		fixable: 'code',

		messages,
	},
};
