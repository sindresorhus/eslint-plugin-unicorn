import {isMethodCall} from './ast/index.js';
import {isArray, isKnownNonArray, needsSemicolon} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-return-array-push/error';
const MESSAGE_ID_SUGGESTION = 'no-return-array-push/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Do not use the return value of `.{{method}}(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Separate the `{{method}}()` call from `return`.',
};

const ignoredCallees = [
	'stream.push',
	'router.push',
	'this.push',
	'this.router.push',
	'this.$router.push',
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

const isIgnoredPushCallee = (callExpression, context) =>
	isIgnoredCallee(callExpression.callee)
	&& !isArray(callExpression.callee.object, context);

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

function getDirectReturnStatement(callExpression) {
	const {parent} = callExpression;

	if (
		parent.type === 'ReturnStatement'
		&& parent.argument === callExpression
	) {
		return parent;
	}
}

function isReturnValueDiscarded(callExpression) {
	const node = getCallExpressionResultNode(callExpression);
	const {parent} = node;
	return (
		parent.type === 'ExpressionStatement'
		// The `void` operator explicitly discards the return value.
		|| (parent.type === 'UnaryExpression' && parent.operator === 'void')
	);
}

// Treat chained result member access as a pragmatic signal for custom APIs like router.push().catch(...).
// Do not flag realistic code only to catch theoretical Number method chains from Array#push().
function isResultMemberAccessed(callExpression) {
	const node = getCallExpressionResultNode(callExpression);
	const {parent} = node;
	return parent.type === 'MemberExpression' && parent.object === node;
}

function getSuggestion(callExpression, returnStatement, method, context) {
	const {sourceCode} = context;

	if (
		returnStatement.parent.type !== 'BlockStatement'
		|| sourceCode.getCommentsInside(returnStatement).length !== sourceCode.getCommentsInside(callExpression).length
	) {
		return;
	}

	return {
		messageId: MESSAGE_ID_SUGGESTION,
		data: {method},
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
				methods: ['push', 'unshift'],
				minimumArguments: 1,
			})
		) {
			return;
		}

		const {property} = callExpression.callee;
		const {name: method} = property;

		if (
			(method === 'push' && isIgnoredPushCallee(callExpression, context))
			|| isReturnValueDiscarded(callExpression)
			|| isResultMemberAccessed(callExpression)
			|| isKnownNonArray(callExpression.callee.object, context)
		) {
			return;
		}

		const problem = {
			node: property,
			messageId: MESSAGE_ID_ERROR,
			data: {method},
		};

		const returnStatement = getDirectReturnStatement(callExpression);
		if (returnStatement) {
			const suggestion = getSuggestion(callExpression, returnStatement, method, context);
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
			description: 'Disallow using the return value of `Array#push()` and `Array#unshift()`.',
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
