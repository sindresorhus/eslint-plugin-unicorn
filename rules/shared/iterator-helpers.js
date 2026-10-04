import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from '../ast/index.js';
import {
	getConstVariableInitializer,
	isArray,
	isTypeScriptExpressionWrapper,
} from '../utils/index.js';
import {createTypeCheckers} from '../utils/type-helpers.js';

const iteratorMethods = [
	'entries',
	'keys',
	'values',
];

const iteratorHelperMethods = [
	'drop',
	'filter',
	'flatMap',
	'map',
	'take',
];

const iteratorStaticMethods = [
	'concat',
	'from',
	'zip',
	'zipKeyed',
];

const iteratorTypeNames = new Set([
	'ArrayIterator',
	'Generator',
	'IterableIterator',
	'Iterator',
	'IteratorObject',
	'MapIterator',
	'RegExpStringIterator',
	'SetIterator',
	'StringIterator',
]);

const {
	isTarget: isIteratorType,
} = createTypeCheckers({
	allowNullishInMixedUnion: true,
	preferTypeReferenceDefinitions: true,
	targetTypeNames: iteratorTypeNames,
});

export const unwrapExpression = node => {
	while (
		isTypeScriptExpressionWrapper(node)
		|| node.type === 'ChainExpression'
		|| node.type === 'ParenthesizedExpression'
	) {
		node = node.expression;
	}

	return node;
};

const isGlobalIteratorReference = (node, context) => {
	node = unwrapExpression(node);

	if (node.type === 'Identifier') {
		return node.name === 'Iterator' && context.sourceCode.isGlobalReference(node);
	}

	if (
		node.type !== 'MemberExpression'
		|| node.optional
		|| node.computed
		|| node.property.type !== 'Identifier'
		|| node.property.name !== 'Iterator'
	) {
		return false;
	}

	const object = unwrapExpression(node.object);

	return object.type === 'Identifier'
		&& object.name === 'globalThis'
		&& context.sourceCode.isGlobalReference(object);
};

const isGlobalIteratorMethodCall = (node, context) =>
	isMethodCall(node, {
		methods: iteratorStaticMethods,
		computed: false,
	})
	&& isGlobalIteratorReference(node.callee.object, context);

const isIteratorMethodCall = node =>
	isMethodCall(node, {
		methods: iteratorMethods,
		argumentsLength: 0,
		computed: false,
	})
	|| isMethodCall(node, {
		method: 'matchAll',
		maximumArguments: 1,
		computed: false,
	});

export const isLazyIteratorHelperCall = (node, context, visitedNodes) =>
	isMethodCall(node, {
		methods: iteratorHelperMethods,
		minimumArguments: 1,
		computed: false,
	})
	&& isIteratorExpression(node.callee.object, context, visitedNodes);

const nonIteratorNodeTypes = new Set([
	'ObjectExpression',
	'ArrayExpression',
	'Literal',
	'TemplateLiteral',
	'FunctionExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
]);

// A literal, a function, a class, or an instance of a local class, is not an `Iterator`
const isKnownNonIteratorValue = (node, context) => {
	node = unwrapExpression(node);

	if (nonIteratorNodeTypes.has(node.type)) {
		return true;
	}

	// `new Vec()` where `Vec` is a local class
	return node.type === 'NewExpression'
		&& node.callee.type === 'Identifier'
		&& (findVariable(context.sourceCode.getScope(node.callee), node.callee)?.defs.some(definition => definition.type === 'ClassName') ?? false);
};

/**
Check if a `.toArray()` receiver is known not to be an `Iterator`. `toArray()` is a very common user-defined method name, so such a receiver must not be treated as one.

The receiver is a literal, a function, a class, or an instance of a local class, or a `const` binding initialized with one, or with a call that returns an array or a string.
*/
export const isKnownNonIterator = (node, context) => {
	if (isKnownNonIteratorValue(node, context)) {
		return true;
	}

	node = unwrapExpression(node);
	if (node.type !== 'Identifier') {
		return false;
	}

	const initializer = getConstVariableInitializer(node, context);
	return Boolean(initializer) && (
		// `const vec = new Vec()` where `Vec` is a local class
		isKnownNonIteratorValue(initializer, context)
		|| isMethodCall(initializer, {
			methods: ['toArray', 'slice', 'concat', 'split'],
			optionalCall: false,
			optionalMember: false,
		})
	);
};

// Only follow plain, unannotated const bindings and unchanged function declarations. Properties, destructuring, mutable bindings, and function return values are intentionally not inferred.
const getImmutableValue = (node, context) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		variable?.defs.length !== 1
		|| variable.references.some(reference => reference.isWrite() && !reference.init)
	) {
		return;
	}

	const [definition] = variable.defs;
	if (definition.type === 'FunctionName' && definition.node.type === 'FunctionDeclaration') {
		return definition.node;
	}

	if (
		definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& definition.node.id.type === 'Identifier'
		&& !definition.node.id.typeAnnotation
	) {
		return definition.node.init;
	}
};

const isSynchronousGeneratorFunction = (node, context, visitedNodes) => {
	while (node) {
		node = unwrapExpression(node);
		if (visitedNodes.has(node)) {
			return false;
		}

		visitedNodes.add(node);
		if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
			return node.generator && !node.async;
		}

		node = getImmutableValue(node, context);
	}

	return false;
};

const isKnownIteratorTypeExpression = (node, context) => {
	if (isArray(node, context)) {
		return false;
	}

	const targetTypeNames = new Set(iteratorTypeNames);
	for (let scope = context.sourceCode.getScope(node); scope; scope = scope.upper) {
		for (const typeName of targetTypeNames) {
			if (scope.set.get(typeName)?.defs.length > 0) {
				targetTypeNames.delete(typeName);
			}
		}
	}

	return isIteratorType(node, context, {targetTypeNames});
};

export function isIteratorExpression(expression, context, visitedNodes = new Set()) {
	const node = unwrapExpression(expression);
	if (visitedNodes.has(node)) {
		return false;
	}

	visitedNodes.add(node);
	const immutableValue = getImmutableValue(node, context);

	return (
		isGlobalIteratorMethodCall(node, context)
		|| isIteratorMethodCall(node)
		|| isLazyIteratorHelperCall(node, context, visitedNodes)
		|| (Boolean(immutableValue) && isIteratorExpression(immutableValue, context, visitedNodes))
		|| (
			node.type === 'CallExpression'
			&& !node.optional
			&& isSynchronousGeneratorFunction(node.callee, context, visitedNodes)
		)
		|| isKnownIteratorTypeExpression(expression, context)
	);
}
