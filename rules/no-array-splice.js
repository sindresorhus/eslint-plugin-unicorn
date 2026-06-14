import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	isValueNotUsable,
	shouldSkipKnownNonArrayReceiver,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {getUnnecessarySpliceReplacement} from './no-unnecessary-splice.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';

const messages = {
	[MESSAGE_ID_ERROR]: 'Use `Array#toSpliced()` instead of `Array#splice()`.',
	[MESSAGE_ID_SUGGESTION]: 'Assign the `.toSpliced()` result back to the array.',
};

function isReassignableVariable(variable) {
	const [definition] = variable.defs;

	if (
		!definition
		|| variable.scope.type === 'global'
	) {
		return false;
	}

	if (definition.type === 'Parameter' || definition.type === 'CatchClause') {
		return true;
	}

	return definition.type === 'Variable'
		&& (definition.parent.kind === 'let' || definition.parent.kind === 'var');
}

function getReceiverIdentifier(node) {
	const unwrappedNode = unwrapTypeScriptExpression(node);

	return unwrappedNode.type === 'Identifier' ? unwrappedNode : undefined;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (
			!isValueNotUsable(callExpression)
			|| !isMethodCall(callExpression, {
				method: 'splice',
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
		) {
			return;
		}

		const {object, property} = callExpression.callee;
		const receiver = getReceiverIdentifier(object);

		if (
			!receiver
			|| getUnnecessarySpliceReplacement(callExpression)
			|| shouldSkipKnownNonArrayReceiver(object, context)
		) {
			return;
		}

		const variable = findVariable(context.sourceCode.getScope(receiver), receiver);

		if (!variable || !isReassignableVariable(variable)) {
			return;
		}

		const receiverText = context.sourceCode.getText(receiver);

		return {
			node: property,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => [
						fixer.insertTextBefore(callExpression, `${receiverText} = `),
						fixer.replaceText(property, 'toSpliced'),
					],
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
			description: 'Prefer `Array#toSpliced()` over `Array#splice()`.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
