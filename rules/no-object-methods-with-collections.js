import {
	getBuiltinCollectionType,
	isGlobalIdentifier,
	getParenthesizedText,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-object-methods-with-collections/error';
const MESSAGE_ID_SUGGESTION = 'no-object-methods-with-collections/suggestion';

const objectMethods = new Set([
	'entries',
	'keys',
	'values',
]);

const messages = {
	[MESSAGE_ID_ERROR]: '`Object.{{method}}()` does not return {{type}} contents.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Array.from({{replacement}})`.',
};

const getMemberObjectText = (node, context) => {
	const text = getParenthesizedText(node, context);
	return shouldAddParenthesesToMemberExpressionObject(node, context) ? `(${text})` : text;
};

const getProblem = (node, context) => {
	const {callee} = node;
	if (
		node.arguments.length !== 1
		|| node.optional
		|| callee.type !== 'MemberExpression'
		|| callee.optional
		|| callee.computed
		|| callee.object.type !== 'Identifier'
		|| callee.object.name !== 'Object'
		|| !isGlobalIdentifier(callee.object, context)
		|| callee.property.type !== 'Identifier'
		|| !objectMethods.has(callee.property.name)
	) {
		return;
	}

	const [argument] = node.arguments;
	const type = getBuiltinCollectionType(argument, context);
	if (!type) {
		return;
	}

	const method = callee.property.name;
	const replacement = `${getMemberObjectText(argument, context)}.${method}()`;
	const problem = {
		node: callee.property,
		messageId: MESSAGE_ID_ERROR,
		data: {
			method,
			type,
		},
	};

	if (context.sourceCode.getCommentsInside(node).length === 0) {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data: {replacement},
				fix: fixer => fixer.replaceText(node, `Array.from(${replacement})`),
			},
		];
	}

	return problem;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => getProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `Object` methods with `Map` or `Set`.',
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
