import {getPropertyName} from '@eslint-community/eslint-utils';
import {
	isGlobalIdentifier,
	isLeftHandSide,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-global-object-property-assignment';
const messages = {
	[MESSAGE_ID]: 'Do not assign properties on the global object.',
};

const globalObjectNames = new Set([
	'global',
	'globalThis',
	'self',
	'window',
]);

const getEffectiveAssignmentTarget = node => {
	while (
		isTypeScriptExpressionWrapper(node.parent)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
};

const isDeleteExpressionArgument = node =>
	node.parent.type === 'UnaryExpression'
	&& node.parent.operator === 'delete'
	&& node.parent.argument === node;

const isForLoopLeftHandSide = node =>
	(
		node.parent.type === 'ForInStatement'
		|| node.parent.type === 'ForOfStatement'
	)
	&& node.parent.left === node;

const isWritableTarget = node =>
	isLeftHandSide(node)
	|| isForLoopLeftHandSide(node);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', node => {
		const object = unwrapTypeScriptExpression(node.object);
		const assignmentTarget = getEffectiveAssignmentTarget(node);

		if (
			object.type !== 'Identifier'
			|| !globalObjectNames.has(object.name)
			|| !isGlobalIdentifier(object, context)
			|| !isWritableTarget(assignmentTarget)
			|| isDeleteExpressionArgument(assignmentTarget)
			|| getPropertyName(node, context.sourceCode.getScope(node)) === null
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow assigning properties on the global object.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
