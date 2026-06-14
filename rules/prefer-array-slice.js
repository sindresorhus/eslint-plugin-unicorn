import {isMemberExpression, isMethodCall} from './ast/index.js';
import {
	isKnownNonArray,
	isLeftHandSide,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-array-slice/error';
const MESSAGE_ID_SUGGESTION = 'prefer-array-slice/suggestion';
const receiverTypeOptions = {
	checkClassHeritage: true,
	checkClassSyntax: true,
	treatMixedUnionAsNonTarget: true,
};
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `Array#slice()` over `Array#splice()` when reading from the returned array.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Array#slice()`.',
};

function isIndexedAccess(node) {
	return isMemberExpression(node.parent, {
		computed: true,
		optional: false,
	})
	&& node.parent.object === node
	&& !isLeftHandSide(node.parent);
}

function isAtCall(node) {
	return isMemberExpression(node.parent, {
		property: 'at',
		optional: false,
	})
	&& node.parent.object === node
	&& isMethodCall(node.parent.parent, {
		method: 'at',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	});
}

function shouldReportReceiver(node, context) {
	return !isKnownNonArray(node, context, receiverTypeOptions);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'splice',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})) {
			return;
		}

		if (!isIndexedAccess(node) && !isAtCall(node)) {
			return;
		}

		if (!shouldReportReceiver(node.callee.object, context)) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(node.callee.property, 'slice'),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Array#slice()` over `Array#splice()` when reading from the returned array.',
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
