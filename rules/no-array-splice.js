import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	isValueNotUsable,
	shouldSkipKnownNonArrayReceiver,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {getUnnecessarySpliceReplacement} from './shared/splice-replacements.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';

const messages = {
	[MESSAGE_ID_ERROR]: 'Use `Array#toSpliced()` instead of `Array#splice()`.',
	[MESSAGE_ID_SUGGESTION]: 'Assign the `.toSpliced()` result back to the array.',
};

const functionTypes = new Set([
	'ArrowFunctionExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);

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

function isTupleTypeAnnotation(node) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isTupleTypeAnnotation(node.typeAnnotation);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly' && isTupleTypeAnnotation(node.typeAnnotation);
		}

		case 'TSTupleType': {
			return true;
		}

		default: {
			return false;
		}
	}
}

function isPlainArrayTypeAnnotation(node) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isPlainArrayTypeAnnotation(node.typeAnnotation);
		}

		case 'TSArrayType': {
			return true;
		}

		case 'TSTypeReference': {
			return node.typeName.type === 'Identifier' && node.typeName.name === 'Array';
		}

		default: {
			return false;
		}
	}
}

function isIdentifierAliasVariable(variable) {
	const [definition] = variable.defs;
	const init = definition?.node.init && unwrapTypeScriptExpression(definition.node.init);

	return definition?.type === 'Variable'
		&& !definition.node.id.typeAnnotation
		&& init?.type === 'Identifier';
}

function isDestructuredVariable(variable) {
	const [definition] = variable.defs;

	return definition?.type === 'Variable' && definition.node.id !== definition.name;
}

function isNonIdentifierParameter(variable) {
	const [definition] = variable.defs;

	return definition?.type === 'Parameter' && !functionTypes.has(definition.name.parent.type);
}

function hasTypeParameterOrTuple(type, checker) {
	if (type.isTypeParameter?.() || checker.isTupleType(type)) {
		return true;
	}

	if (type.isUnion() || type.isIntersection()) {
		return type.types.some(type => hasTypeParameterOrTuple(type, checker));
	}

	return false;
}

function isTypeParameterOrTuple(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const type = parserServices.getTypeAtLocation(node);
		const checker = parserServices.program.getTypeChecker();

		return hasTypeParameterOrTuple(type, checker);
	} catch {
		return false;
	}
}

function shouldSkipReceiver(node, variable, context) {
	const [definition] = variable.defs;
	const typeAnnotation = definition?.name?.typeAnnotation;

	if (isTupleTypeAnnotation(typeAnnotation)) {
		return true;
	}

	if (
		typeAnnotation
		&& !isPlainArrayTypeAnnotation(typeAnnotation)
	) {
		return true;
	}

	return isTypeParameterOrTuple(node, context)
		|| isIdentifierAliasVariable(variable)
		|| isDestructuredVariable(variable)
		|| isNonIdentifierParameter(variable);
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

		if (
			!variable
			|| !isReassignableVariable(variable)
			|| shouldSkipReceiver(object, variable, context)
		) {
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
