import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {
	createTypeCheckers,
	nonTarget,
	target,
	unknown,
} from './utils/type-helpers.js';
import {
	getTypeSymbol,
	isDefaultLibrarySymbol,
} from './utils/types.js';

const MESSAGE_ID = 'no-unsafe-property-key';
const messages = {
	[MESSAGE_ID]: 'Do not use an unsafe value as a property key. Use an explicit string or symbol key instead.',
};

const propertyDefinitionNodeTypes = [
	'Property',
	'MethodDefinition',
	'PropertyDefinition',
	'AccessorProperty',
	'TSAbstractMethodDefinition',
	'TSAbstractPropertyDefinition',
	'TSAbstractAccessorProperty',
];

const isBigIntLiteral = node =>
	(node?.type === 'Literal' && typeof node.value === 'bigint')
	|| (
		node?.type === 'UnaryExpression'
		&& node.operator === '-'
		&& node.argument.type === 'Literal'
		&& typeof node.argument.value === 'bigint'
	);

function getNumberLiteralValue(node) {
	if (node?.type === 'Literal' && typeof node.value === 'number') {
		return node.value;
	}

	if (
		node?.type === 'UnaryExpression'
		&& node.operator === '-'
		&& node.argument.type === 'Literal'
		&& typeof node.argument.value === 'number'
	) {
		return -node.argument.value;
	}
}

const isUnsafeNumber = value =>
	typeof value === 'number'
	&& (!Number.isFinite(value) || (!Number.isSafeInteger(value) && value % 1 === 0));

const isUnsafeNumberLiteral = node =>
	isUnsafeNumber(getNumberLiteralValue(node));

const isUnsafePropertyKeyNode = node =>
	node.type === 'ObjectExpression'
	|| node.type === 'ArrayExpression'
	|| node.type === 'FunctionExpression'
	|| node.type === 'ArrowFunctionExpression'
	|| node.type === 'ClassExpression'
	|| node.type === 'NewExpression'
	|| isBigIntLiteral(node)
	|| isUnsafeNumberLiteral(node);

function isUnsafePropertyKeyTypeAnnotation(node) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isUnsafePropertyKeyTypeAnnotation(node.typeAnnotation);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				&& isUnsafePropertyKeyTypeAnnotation(node.typeAnnotation);
		}

		case 'TSBigIntKeyword':
		case 'TSObjectKeyword':
		case 'TSArrayType':
		case 'TSTupleType': {
			return true;
		}

		case 'TSFunctionType':
		case 'TSConstructorType': {
			return true;
		}

		case 'TSLiteralType': {
			return isBigIntLiteral(node.literal) || isUnsafeNumberLiteral(node.literal);
		}

		default: {
			return false;
		}
	}
}

const isUnsafeStaticValue = value =>
	typeof value === 'bigint'
	|| isUnsafeNumber(value)
	|| (typeof value === 'object' && value !== null);

function getStaticType(value) {
	if (typeof value === 'string' || typeof value === 'symbol') {
		return nonTarget;
	}

	return isUnsafeStaticValue(value) ? target : unknown;
}

function isUnsafePropertyKeyType(type, checker, program) {
	if (
		type.isBigIntLiteral?.()
		|| (type.isNumberLiteral?.() && isUnsafeNumber(type.value))
		|| checker.isArrayType(type)
		|| checker.isTupleType(type)
	) {
		return true;
	}

	if (type.intrinsicName) {
		return type.intrinsicName === 'bigint'
			|| type.intrinsicName === 'object';
	}

	if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
		return true;
	}

	return isDefaultLibrarySymbol(getTypeSymbol(type), program);
}

const {
	isTarget: isUnsafePropertyKey,
} = createTypeCheckers({
	targetTypeNames: new Set([
		'Array',
		'ReadonlyArray',
	]),
	isTargetNode: isUnsafePropertyKeyNode,
	isTargetTypeAnnotation: isUnsafePropertyKeyTypeAnnotation,
	isTargetType: isUnsafePropertyKeyType,
	getStaticType,
});

const isGlobalUnsafeNumberIdentifier = (node, variable) =>
	['NaN', 'Infinity'].includes(node.name)
	&& (!variable || variable.defs.length === 0);

function getConstIdentifierValueNode(variable, visitedVariables) {
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return;
	}

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !definition.node.init
	) {
		return;
	}

	return definition.node.init;
}

function isStaticallyUnsafePropertyKey(node, context, visitedVariables = new Set()) {
	switch (node.type) {
		case 'Identifier': {
			const variable = findVariable(context.sourceCode.getScope(node), node);

			if (isGlobalUnsafeNumberIdentifier(node, variable)) {
				return true;
			}

			const valueNode = getConstIdentifierValueNode(variable, visitedVariables);
			if (!valueNode) {
				return false;
			}

			visitedVariables.add(variable);
			const isUnsafe = isStaticallyUnsafePropertyKey(valueNode, context, visitedVariables);
			visitedVariables.delete(variable);
			return isUnsafe;
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion':
		case 'TSSatisfiesExpression':
		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return isStaticallyUnsafePropertyKey(node.expression, context, visitedVariables);
		}

		case 'SequenceExpression': {
			return isStaticallyUnsafePropertyKey(node.expressions.at(-1), context, visitedVariables);
		}

		case 'ConditionalExpression': {
			return isStaticallyUnsafePropertyKey(node.consequent, context, visitedVariables)
				&& isStaticallyUnsafePropertyKey(node.alternate, context, visitedVariables);
		}

		default: {
			const staticValue = getStaticValue(node, context.sourceCode.getScope(node));

			return isUnsafePropertyKeyNode(node)
				|| (staticValue ? getStaticType(staticValue.value) === target : false);
		}
	}
}

function getPropertyKeyProblem(node, context) {
	if (
		!isStaticallyUnsafePropertyKey(node, context)
		&& !isUnsafePropertyKey(node, context)
	) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
	};
}

function shouldCheckPropertyDefinitionKey(node) {
	return node.computed || isBigIntLiteral(node.key) || isUnsafeNumberLiteral(node.key);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', node => {
		if (!node.computed) {
			return;
		}

		return getPropertyKeyProblem(node.property, context);
	});

	for (const nodeType of propertyDefinitionNodeTypes) {
		context.on(nodeType, node => {
			if (!shouldCheckPropertyDefinitionKey(node)) {
				return;
			}

			return getPropertyKeyProblem(node.key, context);
		});
	}
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unsafe values as property keys.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
