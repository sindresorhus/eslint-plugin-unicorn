import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isFunction,
	isMemberExpression,
	isMethodCall,
	isNewExpression,
} from './ast/index.js';
import {appendArgument} from './fix/index.js';
import {
	getLinebreak,
	getLineIndent,
	getStaticValueForControlFlow,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'require-text-decoder-streaming/error';
const MESSAGE_ID_SUGGESTION = 'require-text-decoder-streaming/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Decode fetch-body chunks with `{stream: true}` using the same decoder, then consume a final `decode()` flush, or use `TextDecoderStream`.',
	[MESSAGE_ID_SUGGESTION]: 'Enable streaming decoding and consume the final flush.',
};
const loopTypes = new Set(['ForOfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement']);

function unwrapExpression(node) {
	node = unwrapTypeScriptExpression(node);
	return node?.type === 'ChainExpression' ? unwrapExpression(node.expression) : node;
}

function unwrapCallee(node) {
	node = unwrapExpression(node);
	if (node?.type !== 'CallExpression' && node?.type !== 'NewExpression') {
		return node;
	}

	const callee = unwrapExpression(node.callee);
	return callee === node.callee ? node : {...node, callee};
}

function getFunction(node) {
	for (; node; node = node.parent) {
		if (isFunction(node) || node.type === 'Program') {
			return node;
		}
	}
}

function getLoop(node) {
	for (let {parent} = node; parent; parent = parent.parent) {
		if (isFunction(parent)) {
			return;
		}

		if (loopTypes.has(parent.type)) {
			return parent;
		}
	}
}

function getBinding(node, context) {
	if (node?.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	if (definition?.type !== 'Variable' || getFunction(definition.node) !== getFunction(node)) {
		return;
	}

	return {variable, definition};
}

function getConstBinding(node, context) {
	const binding = getBinding(node, context);
	if (binding?.definition.parent.kind !== 'const' || binding.variable.references.some(reference => reference.isWrite() && !reference.init)) {
		return;
	}

	return binding;
}

// Resolve only local constant aliases. Destructuring and loop bindings are handled at the chunk boundary below.
function resolveExpression(node, context, visitedVariables = new Set()) {
	node = unwrapExpression(node);
	if (node?.type !== 'Identifier') {
		return node;
	}

	const binding = getConstBinding(node, context);
	if (!binding) {
		return;
	}

	const {variable, definition} = binding;
	if (visitedVariables.has(variable)) {
		return;
	}

	visitedVariables.add(variable);
	if (definition.node.id.type !== 'Identifier' || !definition.node.init) {
		return node;
	}

	if (context.sourceCode.getRange(definition.node)[1] > context.sourceCode.getRange(node)[0]) {
		return;
	}

	return resolveExpression(definition.node.init, context, visitedVariables);
}

function isFetchBody(node, context) {
	node = resolveExpression(node, context);
	if (!isMemberExpression(node, {property: 'body'})) {
		return false;
	}

	const response = resolveExpression(node.object, context);
	if (response?.type !== 'AwaitExpression') {
		return false;
	}

	const call = unwrapCallee(response.argument);
	if (isCallExpression(call, {name: 'fetch', minimumArguments: 1, maximumArguments: 2})) {
		return true;
	}

	if (!isMethodCall(call, {method: 'fetch', minimumArguments: 1, maximumArguments: 2})) {
		return false;
	}

	const object = unwrapExpression(call.callee.object);
	return object.type === 'Identifier' && object.name === 'globalThis';
}

function isFetchRead(node, loop, context) {
	node = resolveExpression(node, context);
	if (node?.type !== 'AwaitExpression' || getLoop(node) !== loop) {
		return false;
	}

	const read = unwrapCallee(node.argument);
	if (!isMethodCall(read, {method: 'read', argumentsLength: 0})) {
		return false;
	}

	const reader = unwrapCallee(resolveExpression(read.callee.object, context));
	return isMethodCall(reader, {method: 'getReader', argumentsLength: 0})
		&& isFetchBody(reader.callee.object, context);
}

function isFetchChunk(node, loop, context) {
	node = resolveExpression(node, context);
	if (isMemberExpression(node, {property: 'value'})) {
		return isFetchRead(node.object, loop, context);
	}

	const binding = getConstBinding(node, context);
	if (!binding) {
		return false;
	}

	const {definition} = binding;
	const declaration = definition.node;
	if (loop.type === 'ForOfStatement' && loop.await && declaration.parent === loop.left && declaration.id === definition.name) {
		return isFetchBody(loop.right, context);
	}

	return declaration.id.type === 'ObjectPattern'
		&& declaration.id.properties.some(property => property.type === 'Property' && getPropertyName(property) === 'value' && property.value === definition.name)
		&& isFetchRead(declaration.init, loop, context);
}

function isNonStreamingOptions(node, context) {
	if (!node) {
		return true;
	}

	node = unwrapExpression(node);
	if (node.type !== 'ObjectExpression') {
		const result = getStaticValueForControlFlow(node, context);
		return result !== undefined && (result.value === undefined || result.value === null);
	}

	// An explicit prototype can supply an inherited `stream` property.
	if (node.properties.some(property =>
		property.type !== 'Property'
		|| property.kind !== 'init'
		|| property.method
		|| getPropertyName(property) === null
		|| getPropertyName(property) === '__proto__',
	)) {
		return false;
	}

	const property = node.properties.findLast(property => getPropertyName(property) === 'stream');
	if (!property) {
		return true;
	}

	const result = getStaticValueForControlFlow(property.value, context);
	return result !== undefined && !result.value;
}

const isPlainDecode = (node, argumentsLength) => isMethodCall(node, {
	method: 'decode',
	argumentsLength,
	optionalCall: false,
	optionalMember: false,
});

function getAccumulation(statement) {
	const expression = statement?.type === 'ExpressionStatement' ? statement.expression : undefined;
	return expression?.type === 'AssignmentExpression' && expression.operator === '+=' && expression.left.type === 'Identifier'
		? expression
		: undefined;
}

function isDoneBreak(statement, declaration, context) {
	if (statement.type !== 'IfStatement' || statement.alternate) {
		return false;
	}

	const done = declaration.id.properties.find(property => property.type === 'Property' && getPropertyName(property) === 'done');
	const binding = getConstBinding(statement.test, context);
	const {consequent} = statement;
	const exit = consequent.type === 'BlockStatement' && consequent.body.length === 1 ? consequent.body[0] : consequent;
	return done?.value.type === 'Identifier'
		&& binding?.definition.name === done.value
		&& exit.type === 'BreakStatement'
		&& !exit.label;
}

function isSimpleLoop(loop, statement, context) {
	const statements = loop.body.type === 'BlockStatement' ? loop.body.body : [];
	if (loop.type === 'ForOfStatement') {
		return loop.await
			&& statements.length === 1
			&& statements[0] === statement
			&& getConstBinding(statement.expression.right.arguments[0], context)?.definition.node.parent === loop.left;
	}

	if (loop.type !== 'WhileStatement' || loop.test.type !== 'Literal' || loop.test.value !== true || statements.length !== 3 || statements[2] !== statement) {
		return false;
	}

	const [readStatement, doneStatement] = statements;
	const declaration = getConstBinding(statement.expression.right.arguments[0], context)?.definition.node;
	return declaration?.parent === readStatement
		&& readStatement.declarations.length === 1
		&& declaration.id.type === 'ObjectPattern'
		&& declaration.id.properties.length === 2
		&& isFetchRead(declaration.init, loop, context)
		&& isDoneBreak(doneStatement, declaration, context);
}

function getBindingBeforeLoop(node, loop, context) {
	const binding = getBinding(node, context);
	if (
		binding?.definition.node.id.type !== 'Identifier'
		|| binding.definition.parent.parent !== loop.parent
		|| context.sourceCode.getRange(binding.definition.node)[1] > context.sourceCode.getRange(loop)[0]
	) {
		return;
	}

	return binding;
}

function getFollowingFlush(node, accumulation, loop, context) {
	const statements = loop.parent.body;
	const next = getAccumulation(statements[statements.indexOf(loop) + 1]);
	return next && isPlainDecode(next.right, 0)
		&& getBinding(next.left, context)?.variable === getBinding(accumulation.left, context)?.variable
		&& getBinding(next.right.callee.object, context)?.variable === getBinding(node.callee.object, context)?.variable
		? next
		: undefined;
}

function canSuggestBindings(node, loop, flush, context) {
	const accumulation = node.parent;
	const decoder = getBindingBeforeLoop(node.callee.object, loop, context);
	const accumulator = getBindingBeforeLoop(accumulation.left, loop, context);
	if (
		decoder?.definition.parent.kind !== 'const'
		|| !isNewExpression(unwrapCallee(decoder.definition.node.init), {name: 'TextDecoder'})
		|| accumulator?.definition.parent.kind !== 'let'
		|| accumulator.definition.node.init?.type !== 'Literal'
		|| accumulator.definition.node.init.value !== ''
	) {
		return false;
	}

	return decoder.variable.references.every(reference => reference.init || reference.identifier === node.callee.object || reference.identifier === flush?.right.callee.object)
		&& accumulator.variable.references.every(reference => !reference.isWrite() || reference.init || reference.identifier === accumulation.left || reference.identifier === flush?.left);
}

function canSuggestOptions(node) {
	if (!node) {
		return true;
	}

	return node.type === 'ObjectExpression'
		&& (node.properties.length === 0 || (
			node.properties.length === 1
			&& getPropertyName(node.properties[0]) === 'stream'
			&& node.properties[0].value?.type === 'Literal'
			&& node.properties[0].value.value === false
		));
}

function getStreamingSuggestion(node, loop, context) {
	const {sourceCode} = context;
	const accumulation = getAccumulation(node.parent.parent);
	if (
		!accumulation
		|| accumulation.right !== node
		|| !isPlainDecode(node, node.arguments.length)
		|| !isSimpleLoop(loop, node.parent.parent, context)
		|| !['BlockStatement', 'Program'].includes(loop.parent.type)
		|| !canSuggestOptions(node.arguments[1])
		|| sourceCode.getCommentsInside(loop).length > 0
		|| sourceCode.getCommentsAfter(loop).some(comment => sourceCode.getLoc(comment).start.line === sourceCode.getLoc(loop).end.line)
	) {
		return;
	}

	const flush = getFollowingFlush(node, accumulation, loop, context);
	if (!canSuggestBindings(node, loop, flush, context)) {
		return;
	}

	const options = node.arguments[1];
	return {
		messageId: MESSAGE_ID_SUGGESTION,
		* fix(fixer) {
			if (!options) {
				yield appendArgument(fixer, node, '{stream: true}', context);
			} else if (options.properties.length === 0) {
				yield fixer.insertTextAfter(sourceCode.getFirstToken(options), 'stream: true');
			} else {
				yield fixer.replaceText(options.properties[0].value, 'true');
			}

			if (!flush) {
				const text = `${sourceCode.getText(accumulation.left)} += ${sourceCode.getText(node.callee.object)}.decode();`;
				yield fixer.insertTextAfter(loop, `${getLinebreak(context)}${getLineIndent(loop, context)}${text}`);
			}
		},
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		const call = unwrapCallee(node);
		if (!isMethodCall(call, {method: 'decode', minimumArguments: 1, maximumArguments: 2}) || !isNonStreamingOptions(node.arguments[1], context)) {
			return;
		}

		const loop = getLoop(node);
		const decoder = unwrapCallee(resolveExpression(call.callee.object, context));
		if (!loop || !isNewExpression(decoder, {name: 'TextDecoder'}) || !isFetchChunk(node.arguments[0], loop, context)) {
			return;
		}

		const problem = {node: call.callee.property, messageId: MESSAGE_ID_ERROR};
		const suggestion = getStreamingSuggestion(node, loop, context);
		if (suggestion) {
			problem.suggest = [suggestion];
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Require streaming decoding of fetch-body chunks with `TextDecoder`.',
			recommended: 'unopinionated',
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
