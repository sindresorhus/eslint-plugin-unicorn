import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isCallExpression, isMethodCall} from './ast/index.js';
import {isArray, isValueNotUsable} from './utils/index.js';

const MESSAGE_ID = 'no-unused-array-method-return';
const messages = {
	[MESSAGE_ID]: 'Do not ignore the return value of `.{{method}}(…)`.',
};

// This list is the implementation contract. We intentionally exclude `toString()` and `toLocaleString()` because they exist on almost every object, and tracking them in this syntax-only rule creates too many non-array false positives.
const methods = new Set([
	'at',
	'concat',
	'entries',
	'every',
	'filter',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'flat',
	'flatMap',
	'includes',
	'indexOf',
	'join',
	'keys',
	'lastIndexOf',
	'map',
	// Using `.some()` as a short-circuiting `forEach()` alternative is an anti-pattern.
	'some',
	'slice',
	'toReversed',
	'toSorted',
	'toSpliced',
	'values',
	'with',
]);

const pascalCaseNamePattern = /^\p{Uppercase_Letter}/v;
const uncertainValue = Symbol('uncertainValue');
const nonArrayFactoryFunctions = new Set([
	'BigInt',
	'Boolean',
	'Number',
	'RegExp',
	'String',
	'Symbol',
]);

const isPascalCaseIdentifier = node =>
	node.type === 'Identifier'
	&& pascalCaseNamePattern.test(node.name);

const isGlobalIdentifier = (node, name, context) =>
	node.type === 'Identifier'
	&& node.name === name
	&& context.sourceCode.isGlobalReference(node);

const isUndefined = (node, context) =>
	isGlobalIdentifier(node, 'undefined', context);

// Treat every construction as non-array unless it uses the global `Array` identifier.
const isKnownNonArrayConstruction = (node, context) =>
	node.type === 'NewExpression'
	&& !isGlobalIdentifier(node.callee, 'Array', context);

const isKnownNonArrayFactoryCall = (node, context) =>
	node.type === 'CallExpression'
	&& node.callee.type === 'Identifier'
	&& nonArrayFactoryFunctions.has(node.callee.name)
	&& context.sourceCode.isGlobalReference(node.callee);

const isDefinitelyNonArrayExpression = (node, context) =>
	isUndefined(node, context)
	|| node.type === 'ObjectExpression'
	|| node.type === 'Literal'
	|| node.type === 'BinaryExpression'
	|| node.type === 'TemplateLiteral'
	|| node.type === 'ArrowFunctionExpression'
	|| node.type === 'FunctionExpression'
	|| node.type === 'ClassExpression'
	|| isKnownNonArrayConstruction(node, context)
	|| isKnownNonArrayFactoryCall(node, context);

function hasEarlierWrite(variable, node, context) {
	const [nodeStart] = context.sourceCode.getRange(node);

	return variable.references.some(reference => !reference.init && reference.isWrite() && context.sourceCode.getRange(reference.identifier)[0] < nodeStart);
}

function getVariableValue(node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || variable.defs.length === 0) {
		return;
	}

	if (variable.defs.length !== 1) {
		return uncertainValue;
	}

	// Supported variable inference boundary:
	// - exactly one binding definition
	// - unannotated plain parameters and explicitly array-typed plain parameters or variables
	// - a `VariableDeclarator` whose id is the same identifier we are resolving
	// - the original declarator initializer for unannotated variables only
	//
	// Unsupported on purpose:
	// - any destructuring, including destructuring with defaults
	// - any explicit non-array or unresolved type annotation
	// - any write before the call site
	// - parameter defaults, rest parameters, `for…of`, catch bindings, and other non-declarator bindings
	// - control-flow-sensitive value tracking
	//
	// This is intentionally extremely small.
	// The rule only trusts a variable declarator initializer when the binding has not been written before the call site.
	// Everything else stays unresolved on purpose.
	if (hasEarlierWrite(variable, node, context)) {
		return uncertainValue;
	}

	const [definition] = variable.defs;
	if (
		definition.type === 'Parameter'
		&& definition.node.params?.includes(definition.name)
	) {
		return definition.name.typeAnnotation && !isArray(definition.name.typeAnnotation, context)
			? uncertainValue
			: undefined;
	}

	if (
		definition.type === 'Variable'
		&& definition.node.type === 'VariableDeclarator'
		&& definition.node.id.type === 'Identifier'
		&& definition.node.id.name === node.name
		&& definition.parent.type === 'VariableDeclaration'
	) {
		const {typeAnnotation} = definition.node.id;
		if (typeAnnotation) {
			return isArray(typeAnnotation, context) ? undefined : uncertainValue;
		}

		return definition.node.init ?? uncertainValue;
	}

	return uncertainValue;
}

function resolveReceiver(node, context, visitedNodes = new Set()) {
	if (!node || node === uncertainValue) {
		return node;
	}

	if (visitedNodes.has(node)) {
		return node;
	}

	visitedNodes.add(node);

	if (node.type === 'Identifier') {
		const value = getVariableValue(node, context);
		if (value === uncertainValue) {
			return value;
		}

		return value === undefined ? node : resolveReceiver(value, context, visitedNodes);
	}

	// Transparent wrappers that do not change the receiver's runtime value.
	if (
		['ChainExpression', 'TSNonNullExpression', 'TSSatisfiesExpression'].includes(node.type)
	) {
		return resolveReceiver(node.expression, context, visitedNodes);
	}

	if (node.type === 'MemberExpression') {
		return uncertainValue;
	}

	if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
		return isArray(node, context) ? node : uncertainValue;
	}

	// Supported receiver inference boundary:
	// - direct receiver expressions that need no value-flow inference, such as `[]` or `getValues()`
	// - trivial identifier aliases to that same initializer, like `const alias = values`
	//
	// Unsupported on purpose:
	// - any destructuring, including destructuring with defaults
	// - any member/property receiver, including `wrapper.items`, `alias.items`, and `this.items`
	// - any object-property, class-field, or `this`-based inference
	// - any write before the call site
	// - any "latest value" reconstruction after assignments
	//
	// This comment is intentionally blunt because this boundary is the feature.
	// The rule is not a general value tracker anymore.
	// If a case requires following properties, destructuring, or writes, we leave it unresolved.
	return node;
}

const isObviouslyNonArrayReceiver = (resolvedReceiver, context) =>
	resolvedReceiver === uncertainValue
	|| isDefinitelyNonArrayExpression(resolvedReceiver, context)
	|| (isPascalCaseIdentifier(resolvedReceiver) && !isArray(resolvedReceiver, context));

const isExpectCall = node =>
	isCallExpression(node, 'expect')
	|| isMethodCall(node, {
		object: 'expect',
		methods: ['element', 'poll', 'soft'],
	});

const shouldSkipReceiver = (node, method, context) => {
	const resolvedReceiver = resolveReceiver(node, context);
	if (isExpectCall(resolvedReceiver)) {
		return true;
	}

	if (method === 'values') {
		return resolvedReceiver === uncertainValue || !isArray(resolvedReceiver, context);
	}

	return isObviouslyNonArrayReceiver(resolvedReceiver, context);
};

const getTrackedMethodName = (node, context) =>
	node.callee.type === 'MemberExpression'
		? getPropertyName(node.callee, context.sourceCode.getScope(node.callee))
		: undefined;

// Supported discarded-value boundary:
// - direct unused expressions handled by `isValueNotUsable()`
// - `await foo.map()` when the awaited expression is itself directly discarded
// - TypeScript assertion wrappers around that same direct discard site
// - direct `for` init/update expressions like `for (foo.map(); ; )` and `for (; ; foo.map())`
//
// Unsupported on purpose:
// - comma-expression wrappers
// - logical wrappers like `condition && foo.map()`
// - conditional wrappers like `condition ? foo.map() : other()`
// - any other parent-expression pattern not listed above
//
// The rule stops after this short fixed wrapper list.
// We intentionally do not keep climbing through arbitrary parent expressions just to catch one more nested discard shape.
const isDiscardedExpression = node => {
	while (true) {
		if (isValueNotUsable(node)) {
			return true;
		}

		const {parent} = node;
		if (
			parent.type === 'ForStatement'
			&& (parent.init === node || parent.update === node)
		) {
			return true;
		}

		if (
			parent.type !== 'ChainExpression'
			&& parent.type !== 'AwaitExpression'
			&& parent.type !== 'TSAsExpression'
			&& parent.type !== 'TSTypeAssertion'
			&& parent.type !== 'TSNonNullExpression'
			&& parent.type !== 'TSSatisfiesExpression'
		) {
			return false;
		}

		node = parent;
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		const method = getTrackedMethodName(node, context);
		if (
			!methods.has(method)
			|| !isDiscardedExpression(node)
			|| shouldSkipReceiver(node.callee.object, method, context)
		) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: MESSAGE_ID,
			data: {
				method,
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow ignoring the return value of selected array methods.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
