import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {isValueNotUsable} from './utils/index.js';

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

		if (object.type !== 'Identifier') {
			return;
		}

		const variable = findVariable(context.sourceCode.getScope(object), object);

		if (!variable || !isReassignableVariable(variable)) {
			return;
		}

		return {
			node: property,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => [
						fixer.insertTextBefore(callExpression, `${object.name} = `),
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
			recommended: false,
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
