import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {getVariableIdentifiers} from './utils/index.js';
import {isCallOrNewExpression, isMethodCall} from './ast/index.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const MAX_ARRAY_LENGTH = (2 ** 32) - 1;
const messages = {
	[MESSAGE_ID_ERROR]: '`{{name}}` should be a `Set`, and use `{{name}}.has()` to check existence or non-existence.',
	[MESSAGE_ID_SUGGESTION]: 'Switch `{{name}}` to `Set`.',
};

/*
Some of these methods can be `Iterator`.

Since `Iterator` don't have an `includes()` method, we are safe to assume they are array. Except `concat` and `slice` which can be a string: https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2216
*/
const methodsReturnsArray = [
	// `Array`
	'copyWithin',
	'fill',
	'filter',
	'flat',
	'flatMap',
	'map',
	'reverse',
	'sort',
	'splice',
	'toReversed',
	'toSorted',
	'toSpliced',
	'with',

	// `String`
	'split',

	// `Iterator`
	'toArray',
];

const methodsReturnsArrayAndString = [
	'slice',
	'concat',
];

const isStringLiteral = node =>
	(node.type === 'Literal' && typeof node.value === 'string')
	|| (node.type === 'TemplateLiteral' && node.expressions.length === 0);

const isIdentifierInitializedWithArray = (node, scope, visitedVariables = new Set()) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(scope, node);
	if (!variable || visitedVariables.has(variable) || variable.defs.length !== 1) {
		return false;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;

	return definition.type === 'Variable'
		&& definition.kind === 'const'
		&& Boolean(definition.node.init)
		&& isArrayMethodCall(definition.node.init, scope, visitedVariables);
};

const isIncludesCall = node =>
	isMethodCall(node.parent.parent, {
		method: 'includes',
		optionalCall: false,
		optionalMember: false,
		argumentsLength: 1,
	})
	&& node.parent.object === node;

const multipleCallNodeTypes = new Set([
	'ForOfStatement',
	'ForStatement',
	'ForInStatement',
	'WhileStatement',
	'DoWhileStatement',
	'FunctionDeclaration',
	'FunctionExpression',
	'ArrowFunctionExpression',
]);

const isMultipleCall = (identifier, node) => {
	const root = node.parent.parent.parent;
	let {parent} = identifier.parent; // `.include()` callExpression
	while (
		parent
		&& parent !== root
	) {
		if (multipleCallNodeTypes.has(parent.type)) {
			return true;
		}

		parent = parent.parent;
	}

	return false;
};

const isArrayMethodCall = (node, scope, visitedVariables = new Set()) =>
	// `[]`
	node.type === 'ArrayExpression'
	// `Array()` and `new Array()`
	|| isCallOrNewExpression(node, {
		name: 'Array',
		optional: false,
	})
	// `Array.from()` and `Array.of()`
	|| isMethodCall(node, {
		object: 'Array',
		methods: ['from', 'of'],
		optionalCall: false,
		optionalMember: false,
	})
	// Methods that return an array
	|| isMethodCall(node, {
		methods: methodsReturnsArray,
		optionalCall: false,
		optionalMember: false,
	})
	|| (
		isMethodCall(node, {
			methods: methodsReturnsArrayAndString,
			optionalCall: false,
			optionalMember: false,
		})
		&& !isStringLiteral(node.callee.object)
		&& (
			node.callee.object.type !== 'Identifier'
			|| isIdentifierInitializedWithArray(node.callee.object, scope, visitedVariables)
		)
	);

const isNonNegativeInteger = value =>
	Number.isInteger(value)
	&& value >= 0;

const isArrayLength = value =>
	isNonNegativeInteger(value)
	&& value <= MAX_ARRAY_LENGTH;

const getStaticArrayLength = (node, scope) => {
	const result = getStaticValue(node, scope);

	if (isArrayLength(result?.value)) {
		return result.value;
	}
};

const hasSpread = nodes => nodes.some(node => node?.type === 'SpreadElement');

const isLengthProperty = property => {
	if (
		property.type !== 'Property'
		|| property.computed
	) {
		return false;
	}

	const {key} = property;

	return (
		(key.type === 'Identifier' && key.name === 'length')
		|| (key.type === 'Literal' && key.value === 'length')
	);
};

const getObjectLength = (node, scope) => {
	if (
		node.type !== 'ObjectExpression'
		|| node.properties.length !== 1
	) {
		return;
	}

	const [property] = node.properties;

	if (isLengthProperty(property)) {
		return getStaticArrayLength(property.value, scope);
	}
};

const getArrayFromSize = (node, scope) => {
	const [source] = node.arguments;

	if (!source || source.type === 'SpreadElement') {
		return;
	}

	if (source.type === 'ArrayExpression') {
		return hasSpread(source.elements) ? undefined : source.elements.length;
	}

	if (isStringLiteral(source)) {
		const result = getStaticValue(source, scope);
		return typeof result?.value === 'string' ? [...result.value].length : undefined;
	}

	return getObjectLength(source, scope);
};

const getArrayConstructorSize = (node, scope) => {
	if (hasSpread(node.arguments)) {
		return;
	}

	if (node.arguments.length !== 1) {
		return node.arguments.length;
	}

	const result = getStaticValue(node.arguments[0], scope);

	if (!result) {
		return;
	}

	const {value} = result;

	if (typeof value !== 'number') {
		return 1;
	}

	if (isArrayLength(value)) {
		return value;
	}
};

const getKnownArraySize = (node, scope) => {
	if (node.type === 'ArrayExpression') {
		return hasSpread(node.elements) ? undefined : node.elements.length;
	}

	if (
		isCallOrNewExpression(node, {
			name: 'Array',
			optional: false,
		})
	) {
		return getArrayConstructorSize(node, scope);
	}

	if (
		isMethodCall(node, {
			object: 'Array',
			method: 'of',
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return hasSpread(node.arguments) ? undefined : node.arguments.length;
	}

	if (
		isMethodCall(node, {
			object: 'Array',
			method: 'from',
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return getArrayFromSize(node, scope);
	}
};

const isNodeInside = (sourceCode, node, parent) => {
	const nodeRange = sourceCode.getRange(node);
	const parentRange = sourceCode.getRange(parent);

	return nodeRange[0] >= parentRange[0]
		&& nodeRange[1] <= parentRange[1];
};

const hasCommentsOutsideNode = (sourceCode, node, child) =>
	sourceCode.getCommentsInside(node).some(comment => !isNodeInside(sourceCode, comment, child));

const getSetTypeAnnotationText = (typeAnnotation, sourceCode) => {
	if (typeAnnotation.type === 'TSArrayType') {
		if (hasCommentsOutsideNode(sourceCode, typeAnnotation, typeAnnotation.elementType)) {
			return;
		}

		return `Set<${sourceCode.getText(typeAnnotation.elementType)}>`;
	}

	if (
		typeAnnotation.type === 'TSTypeOperator'
		&& typeAnnotation.operator === 'readonly'
		&& typeAnnotation.typeAnnotation.type === 'TSArrayType'
	) {
		if (hasCommentsOutsideNode(sourceCode, typeAnnotation, typeAnnotation.typeAnnotation.elementType)) {
			return;
		}

		return `ReadonlySet<${sourceCode.getText(typeAnnotation.typeAnnotation.elementType)}>`;
	}

	if (
		typeAnnotation.type !== 'TSTypeReference'
		|| typeAnnotation.typeName.type !== 'Identifier'
	) {
		return;
	}

	const typeArguments = typeAnnotation.typeArguments ?? typeAnnotation.typeParameters;
	if (typeArguments?.params.length !== 1) {
		return;
	}

	if (hasCommentsOutsideNode(sourceCode, typeAnnotation, typeArguments)) {
		return;
	}

	if (typeAnnotation.typeName.name === 'Array') {
		return `Set${sourceCode.getText(typeArguments)}`;
	}

	if (typeAnnotation.typeName.name === 'ReadonlyArray') {
		return `ReadonlySet${sourceCode.getText(typeArguments)}`;
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {minimumItems} = context.options[0];

	context.on('Identifier', node => {
		const {parent} = node;

		if (!(
			parent.type === 'VariableDeclarator'
			&& parent.id === node
			&& Boolean(parent.init)
			&& parent.parent.type === 'VariableDeclaration'
			&& parent.parent.declarations.includes(parent)
			// Exclude `export const foo = [];`
			&& !(
				parent.parent.parent.type === 'ExportNamedDeclaration'
				&& parent.parent.parent.declaration === parent.parent
			)
			&& isArrayMethodCall(parent.init, context.sourceCode.getScope(parent.init))
		)) {
			return;
		}

		if (minimumItems > 0) {
			const arraySize = getKnownArraySize(parent.init, context.sourceCode.getScope(parent.init));
			if (
				arraySize === undefined
				|| arraySize < minimumItems
			) {
				return;
			}
		}

		const variable = findVariable(context.sourceCode.getScope(node), node);

		// This was reported https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1075#issuecomment-768073342
		// But can't reproduce, just ignore this case
		/* c8 ignore next 3 */
		if (!variable) {
			return;
		}

		const identifiers = getVariableIdentifiers(variable).filter(identifier => identifier !== node);

		if (
			identifiers.length === 0
			|| identifiers.some(identifier => !isIncludesCall(identifier))
		) {
			return;
		}

		if (
			identifiers.length === 1
			&& identifiers.every(identifier => !isMultipleCall(identifier, node))
		) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				name: node.name,
			},
		};

		const setTypeAnnotationText = node.typeAnnotation && getSetTypeAnnotationText(node.typeAnnotation.typeAnnotation, context.sourceCode);

		const fix = function * (fixer) {
			if (setTypeAnnotationText) {
				yield fixer.replaceText(node.typeAnnotation.typeAnnotation, setTypeAnnotationText);
			}

			yield fixer.insertTextBefore(node.parent.init, 'new Set(');
			yield fixer.insertTextAfter(node.parent.init, ')');

			for (const identifier of identifiers) {
				yield fixer.replaceText(identifier.parent.property, 'has');
			}
		};

		if (node.typeAnnotation && !setTypeAnnotationText) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			minimumItems: {
				type: 'integer',
				minimum: 0,
				description: 'The minimum known array size before `Set#has()` is enforced.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [
			{
				minimumItems: 0,
			},
		],
		messages,
	},
};

export default config;
