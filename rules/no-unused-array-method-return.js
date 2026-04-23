import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isValueNotUsable} from './utils/index.js';

const MESSAGE_ID = 'no-unused-array-method-return';
const messages = {
	[MESSAGE_ID]: 'Do not ignore the return value of `.{{method}}(…)`.',
};

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
	// Using these as short-circuiting `forEach()` alternatives is an anti-pattern.
	'some',
	'slice',
	// This list is the implementation contract. We intentionally exclude
	// `toString()` and `toLocaleString()` because they exist on almost every
	// object, and tracking them in this syntax-only rule creates too many
	// non-array false positives.
	'toReversed',
	'toSorted',
	'toSpliced',
	'values',
	'with',
]);

const pascalCaseNamePattern = /^\p{Lu}/v;
const uncertainValue = Symbol('uncertainValue');
const nonArrayFactoryFunctions = new Set([
	'BigInt',
	'Boolean',
	'Number',
	'RegExp',
	'String',
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

// Treat `new Foo()` as non-array unless it is the global `Array`. Local `Array`
// subclasses are intentionally out of scope for this best-effort inference.
const isKnownNonArrayConstruction = (node, context) =>
	node.type === 'NewExpression'
	&& node.callee.type === 'Identifier'
	&& !isGlobalIdentifier(node.callee, 'Array', context);

const isKnownNonArrayFactoryCall = (node, context) =>
	node.type === 'CallExpression'
	&& node.callee.type === 'Identifier'
	&& nonArrayFactoryFunctions.has(node.callee.name)
	&& context.sourceCode.isGlobalReference(node.callee);

const isDefinitelyArrayExpression = (node, context) =>
	node.type === 'ArrayExpression'
	|| (
		(node.type === 'CallExpression' || node.type === 'NewExpression')
		&& isGlobalIdentifier(node.callee, 'Array', context)
	);

const isDefinitelyNonArrayExpression = (node, context) =>
	isUndefined(node, context)
	|| node.type === 'ObjectExpression'
	|| node.type === 'Literal'
	|| node.type === 'TemplateLiteral'
	|| node.type === 'ArrowFunctionExpression'
	|| node.type === 'FunctionExpression'
	|| node.type === 'ClassExpression'
	|| isKnownNonArrayConstruction(node, context)
	|| isKnownNonArrayFactoryCall(node, context);

function getVariable(node, context) {
	if (node.type !== 'Identifier') {
		return;
	}

	return findVariable(context.sourceCode.getScope(node), node);
}

function hasEarlierWrite(variable, node, context) {
	if (!variable) {
		return false;
	}

	const [nodeStart] = context.sourceCode.getRange(node);

	return variable.references.some(reference => !reference.init && reference.isWrite() && context.sourceCode.getRange(reference.identifier)[0] < nodeStart);
}

function getVariableValue(node, context) {
	const variable = getVariable(node, context);
	if (!variable) {
		return;
	}

	if (variable.defs.length !== 1) {
		return uncertainValue;
	}

	// Supported variable inference boundary:
	// - exactly one binding definition
	// - a `VariableDeclarator` whose id is the same identifier we are resolving
	// - the original declarator initializer only
	//
	// Unsupported on purpose:
	// - any destructuring, including defaults
	// - any write before the call site
	// - aliasing through another identifier
	// - parameter defaults, `for…of`, catch bindings, and any non-declarator binding
	// - control-flow-sensitive value tracking
	//
	// This is intentionally extremely small. The rule only trusts the initializer
	// syntax of `const value = ...` or `let value = ...` when the binding has not
	// been written again. Everything else stays unresolved on purpose.
	if (hasEarlierWrite(variable, node, context)) {
		return uncertainValue;
	}

	const [definition] = variable.defs;
	if (
		definition.type === 'Variable'
		&& definition.node.type === 'VariableDeclarator'
		&& definition.node.id.type === 'Identifier'
		&& definition.node.id.name === node.name
		&& definition.node.init
		&& definition.parent.type === 'VariableDeclaration'
	) {
		return definition.node.init;
	}

	return uncertainValue;
}

function getStaticPropertyName(node, context) {
	return getPropertyName(node, context.sourceCode.getScope(node));
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

	if (node.type === 'ChainExpression') {
		return resolveReceiver(node.expression, context, visitedNodes);
	}

	if (node.type === 'MemberExpression') {
		return uncertainValue;
	}

	// Supported receiver inference boundary:
	// - the receiver expression itself, if it is direct array syntax like `[]`
	// - trivial identifier aliases to that same initializer, like `const alias = values`
	//
	// Unsupported on purpose:
	// - any destructuring, including defaults
	// - any member/property receiver, including `wrapper.items`, `alias.items`, and `this.items`
	// - any object, class-field, or `this`-based inference
	// - any class field or constructor reasoning, even when `this.items = []` looks obvious
	// - any write before the call site
	// - any "latest value" reconstruction after assignments
	//
	// This comment is intentionally blunt because this boundary is the feature:
	// the rule is not a general value tracker anymore. If a case requires
	// following properties, destructuring, or writes, we leave it unresolved.
	return node;
}

const isObviouslyNonArrayReceiver = (node, context) => {
	node = resolveReceiver(node, context);

	return node === uncertainValue
		|| isDefinitelyNonArrayExpression(node, context)
		|| (
			isPascalCaseIdentifier(node)
			&& !isDefinitelyArrayExpression(node, context)
		);
};

const getTrackedMethodName = (node, context) =>
	node.callee.type === 'MemberExpression'
		? getStaticPropertyName(node.callee, context)
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
// The rule stops after this short fixed wrapper list. We intentionally do not
// keep climbing through arbitrary parent expressions just to catch one more
// nested discard shape.
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
			|| isObviouslyNonArrayReceiver(node.callee.object, context)
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
	},
};

export default config;
