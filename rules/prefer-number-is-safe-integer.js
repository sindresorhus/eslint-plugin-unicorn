import {findVariable} from '@eslint-community/eslint-utils';
import {isLiteral, isMethodCall} from './ast/index.js';
import isSameReference from './utils/is-same-reference.js';

const MESSAGE_ID_ERROR = 'prefer-number-is-safe-integer/error';
const MESSAGE_ID_SUGGESTION = 'prefer-number-is-safe-integer/suggestion';
const MESSAGE_ID_INTEGER_CHECK_ERROR = 'prefer-number-is-safe-integer/integer-check-error';
const MESSAGE_ID_INTEGER_CHECK_SUGGESTION = 'prefer-number-is-safe-integer/integer-check-suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `Number.isSafeInteger()` over `Number.isInteger()`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `Number.isInteger()` with `Number.isSafeInteger()`.',
	[MESSAGE_ID_INTEGER_CHECK_ERROR]: 'Prefer `Number.isSafeInteger()` over this integer check.',
	[MESSAGE_ID_INTEGER_CHECK_SUGGESTION]: 'Replace this integer check with `Number.isSafeInteger()`.',
};

const lodashObjects = ['_', 'lodash', 'underscore'];
const mathIntegerCheckMethods = ['floor', 'trunc'];

const getExpressionText = (node, sourceCode) => {
	const text = sourceCode.getText(node);
	return node.type === 'SequenceExpression' ? `(${text})` : text;
};

const hasCommentsOutsideNode = (node, nodeToKeep, sourceCode) => {
	const keepRange = sourceCode.getRange(nodeToKeep);

	return sourceCode.getCommentsInside(node).some(comment => {
		const commentRange = sourceCode.getRange(comment);
		return commentRange[0] < keepRange[0] || commentRange[1] > keepRange[1];
	});
};

const isGlobalNumberAvailable = (node, sourceCode) => {
	const variable = findVariable(sourceCode.getScope(node), 'Number');
	return !variable || (variable.scope.type === 'global' && variable.defs.length === 0);
};

const getModuloCheckArgument = node => {
	if (
		node.type !== 'BinaryExpression'
		|| node.operator !== '%'
		|| !isLiteral(node.right, 1)
	) {
		return;
	}

	return node.left;
};

const getModuloIntegerCheckArgument = node => {
	if (node.operator !== '===') {
		return;
	}

	if (isLiteral(node.right, 0)) {
		return getModuloCheckArgument(node.left);
	}

	if (isLiteral(node.left, 0)) {
		return getModuloCheckArgument(node.right);
	}
};

const getMathIntegerCheckArgument = (node, sourceCode) => {
	if (
		!isMethodCall(node, {
			object: 'Math',
			methods: mathIntegerCheckMethods,
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
		|| !sourceCode.isGlobalReference(node.callee.object)
	) {
		return;
	}

	return node.arguments[0];
};

const getMathComparisonIntegerCheckArgument = (node, sourceCode) => {
	if (node.operator !== '===') {
		return;
	}

	const leftArgument = getMathIntegerCheckArgument(node.left, sourceCode);
	if (leftArgument && isSameReference(leftArgument, node.right)) {
		return leftArgument;
	}

	const rightArgument = getMathIntegerCheckArgument(node.right, sourceCode);
	if (rightArgument && isSameReference(rightArgument, node.left)) {
		return rightArgument;
	}
};

const getLodashIntegerCheckArgument = node => {
	if (!isMethodCall(node, {
		objects: lodashObjects,
		methods: ['isInteger', 'isSafeInteger'],
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})) {
		return;
	}

	return node.arguments[0];
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	const createIntegerCheckProblem = (node, argument) => {
		const problem = {
			node,
			messageId: MESSAGE_ID_INTEGER_CHECK_ERROR,
		};

		if (!hasCommentsOutsideNode(node, argument, sourceCode)) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_INTEGER_CHECK_SUGGESTION,
					fix: fixer => fixer.replaceText(node, `Number.isSafeInteger(${getExpressionText(argument, sourceCode)})`),
				},
			];
		}

		return problem;
	};

	context.on('CallExpression', callExpression => {
		if (
			isMethodCall(callExpression, {
				object: 'Number',
				method: 'isInteger',
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			&& sourceCode.isGlobalReference(callExpression.callee.object)
		) {
			return {
				node: callExpression.callee.property,
				messageId: MESSAGE_ID_ERROR,
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						fix: fixer => fixer.replaceText(callExpression.callee.property, 'isSafeInteger'),
					},
				],
			};
		}

		const argument = getLodashIntegerCheckArgument(callExpression);
		if (!argument || !isGlobalNumberAvailable(callExpression, sourceCode)) {
			return;
		}

		return createIntegerCheckProblem(callExpression, argument);
	});

	context.on('BinaryExpression', node => {
		const argument = getModuloIntegerCheckArgument(node) ?? getMathComparisonIntegerCheckArgument(node, sourceCode);
		if (!argument || !isGlobalNumberAvailable(node, sourceCode)) {
			return;
		}

		return createIntegerCheckProblem(node, argument);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Number.isSafeInteger()` over integer checks.',
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
