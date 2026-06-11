import {isMethodCall} from './ast/index.js';
import {needsSemicolon} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-return-array-push/error';
const MESSAGE_ID_SUGGESTION = 'no-return-array-push/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Do not return the result of `.push(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Separate the `push()` call from `return`.',
};

const ignoredCallees = [
	'stream.push',
	'this.push',
	'this.stream.push',
	'process.stdin.push',
	'process.stdout.push',
	'process.stderr.push',
];

const transparentExpressionTypes = new Set([
	'ChainExpression',
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSNonNullExpression',
	'TSTypeAssertion',
]);

function isStaticMemberPath(node, path) {
	const names = path.split('.');

	for (let index = names.length - 1; index >= 0; index--) {
		const name = names[index];

		if (index === 0) {
			return (
				(node.type === 'Identifier' && node.name === name)
				|| (name === 'this' && node.type === 'ThisExpression')
			);
		}

		if (
			node.type !== 'MemberExpression'
			|| node.computed
			|| node.property.type !== 'Identifier'
			|| node.property.name !== name
		) {
			return false;
		}

		node = node.object;
	}
}

const isIgnoredCallee = callee => ignoredCallees.some(ignoredCallee => isStaticMemberPath(callee, ignoredCallee));

function getCallExpressionResultNode(callExpression) {
	let node = callExpression;

	while (
		transparentExpressionTypes.has(node.parent.type)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
}

function getReturnNode(callExpression) {
	const node = getCallExpressionResultNode(callExpression);
	const {parent} = node;

	if (
		parent.type === 'ReturnStatement'
		&& parent.argument === node
	) {
		return parent;
	}

	if (
		parent.type === 'ArrowFunctionExpression'
		&& parent.body === node
	) {
		return parent;
	}
}

function getSuggestion(callExpression, returnStatement, context) {
	const {sourceCode} = context;

	if (
		returnStatement.parent.type !== 'BlockStatement'
		|| sourceCode.getCommentsInside(returnStatement).length !== sourceCode.getCommentsInside(callExpression).length
	) {
		return;
	}

	return {
		messageId: MESSAGE_ID_SUGGESTION,
		fix(fixer) {
			const callText = sourceCode.getText(callExpression);
			const semicolon = needsSemicolon(sourceCode.getTokenBefore(returnStatement), context, callText) ? ';' : '';

			return fixer.replaceText(returnStatement, `${semicolon}${callText}; return;`);
		},
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (
			!isMethodCall(callExpression, {
				method: 'push',
				minimumArguments: 1,
			})
			|| isIgnoredCallee(callExpression.callee)
		) {
			return;
		}

		const returnNode = getReturnNode(callExpression);
		if (!returnNode) {
			return;
		}

		const problem = {
			node: callExpression.callee.property,
			messageId: MESSAGE_ID_ERROR,
		};

		if (returnNode.type === 'ReturnStatement') {
			const suggestion = getSuggestion(callExpression, returnNode, context);
			if (suggestion) {
				problem.suggest = [suggestion];
			}
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow returning the result of `Array#push()` with arguments.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
