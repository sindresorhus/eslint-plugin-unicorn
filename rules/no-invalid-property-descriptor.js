import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {getOutermostTypeScriptExpression, getStaticValueForControlFlow, unwrapTypeScriptExpression} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const messages = {
	'incompatible-fields': 'A property descriptor cannot combine `get` or `set` with `value` or `writable`.',
	'non-object-descriptor': 'A property descriptor must be an object.',
	'non-callable-accessor': 'The `{{name}}` field must be a function or `undefined`.',
	'unknown-field': 'Unknown property descriptor field `{{name}}`.',
	'rename-writeable': 'Rename `writeable` to `writable`.',
};

const descriptorFields = new Set(['value', 'writable', 'get', 'set', 'enumerable', 'configurable']);
const primitiveExpressionTypes = new Set(['BinaryExpression', 'TemplateLiteral', 'UnaryExpression', 'UpdateExpression']);

const isPrimitive = value => value === null || !['object', 'function'].includes(typeof value);

function getPropertyKey(node, context) {
	if (!node.computed) {
		return getPropertyName(node) ?? undefined;
	}

	const key = node.type === 'MemberExpression' ? node.property : node.key;
	const staticValue = getStaticValueForControlFlow(key, context);
	if (!staticValue || !isPrimitive(staticValue.value)) {
		return;
	}

	return typeof staticValue.value === 'symbol' ? staticValue.value : String(staticValue.value);
}

function getDescriptorArgument(node, context) {
	if (!isMethodCall(node, {
		objects: ['Object', 'Reflect'],
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	const method = getPropertyKey(node.callee, context);
	const isMap = node.callee.object.name === 'Object' && ['defineProperties', 'create'].includes(method);
	if (method !== 'defineProperty' && !isMap) {
		return;
	}

	const argumentIndex = isMap ? 1 : 2;
	if (
		node.arguments.length <= argumentIndex
		|| node.arguments.slice(0, argumentIndex + 1).some(argument => argument.type === 'SpreadElement')
	) {
		return;
	}

	return {node: node.arguments[argumentIndex], isMap};
}

function getObjectVariable(node, context) {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	if (
		definition?.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| definition.parent.parent.type === 'ExportNamedDeclaration'
		|| unwrapTypeScriptExpression(definition.node.init)?.type !== 'ObjectExpression'
	) {
		return;
	}

	return variable;
}

function isSafeMapObject(node, context) {
	node = getOutermostTypeScriptExpression(node);
	const argument = getDescriptorArgument(node.parent, context);
	if (argument?.isMap && argument.node === node) {
		return true;
	}

	const declaration = node.parent;
	if (declaration.type !== 'VariableDeclarator' || declaration.init !== node) {
		return false;
	}

	const variable = getObjectVariable(declaration.id, context);
	return Boolean(variable && isSafeObjectVariable(variable, true, context));
}

function isSafeObjectUse(node, isMap, context) {
	node = getOutermostTypeScriptExpression(node);
	const argument = getDescriptorArgument(node.parent, context);
	if (argument?.isMap === isMap && argument.node === node) {
		return true;
	}

	const property = node.parent;
	return !isMap
		&& property.type === 'Property'
		&& property.kind === 'init'
		&& property.value === node
		&& property.parent.type === 'ObjectExpression'
		&& isSafeMapObject(property.parent, context);
}

// Only descriptor/map consumption is allowed. Member reads, aliases, exports, and arbitrary arguments could expose the object to mutation.
function isSafeObjectVariable(variable, isMap, context) {
	return variable.references.some(reference => reference.isRead())
		&& variable.references.every(reference => reference.init
			|| (reference.isReadOnly() && isSafeObjectUse(reference.identifier, isMap, context)));
}

function getObjectExpression(node, isMap, context) {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'ObjectExpression') {
		return node;
	}

	const variable = getObjectVariable(node, context);
	if (
		!variable
		|| context.sourceCode.getRange(variable.defs[0].node)[1] > context.sourceCode.getRange(node)[0]
		|| !isSafeObjectVariable(variable, isMap, context)
	) {
		return;
	}

	return unwrapTypeScriptExpression(variable.defs[0].node.init);
}

function getEffectiveProperties(node, isMap, context) {
	const properties = new Map();
	for (const property of node.properties) {
		if (property.type !== 'Property') {
			return;
		}

		const key = getPropertyKey(property, context);
		if (key === undefined) {
			return;
		}

		// This syntax sets the prototype rather than defining an own property. Map prototypes do not contribute descriptor entries.
		if (key === '__proto__' && !property.computed && !property.shorthand && !property.method && property.kind === 'init') {
			const value = unwrapTypeScriptExpression(property.value);
			if (!isMap && !(value.type === 'Literal' && value.value === null)) {
				return;
			}

			continue;
		}

		properties.set(key, property);
	}

	return properties;
}

function isNonObjectDescriptor(node, context) {
	node = unwrapTypeScriptExpression(node);
	if (primitiveExpressionTypes.has(node.type) || (node.type === 'Literal' && !node.regex)) {
		return true;
	}

	const staticValue = getStaticValueForControlFlow(node, context);
	return Boolean(staticValue && isPrimitive(staticValue.value));
}

function isNonCallableAccessor(node, context) {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'UnaryExpression' && node.operator === 'void') {
		return false;
	}

	if (['Literal', 'ArrayExpression', 'ObjectExpression'].includes(node.type) || primitiveExpressionTypes.has(node.type)) {
		return true;
	}

	const staticValue = getStaticValueForControlFlow(node, context);
	return Boolean(staticValue && staticValue.value !== undefined && typeof staticValue.value !== 'function');
}

function getWriteableSuggestion(property, context) {
	const {sourceCode} = context;
	if (sourceCode.getCommentsInside(property.key).length > 0) {
		return;
	}

	let replacement = property.computed || property.key.type === 'Literal' ? '\'writable\'' : 'writable';
	if (property.shorthand) {
		replacement = `writable: ${sourceCode.getText(property.key)}`;
	}

	return {messageId: 'rename-writeable', fix: fixer => fixer.replaceText(property.key, replacement)};
}

function * getDescriptorProblems(node, context, checkedDescriptors) {
	const descriptor = getObjectExpression(node, false, context);
	if (!descriptor) {
		if (isNonObjectDescriptor(node, context)) {
			yield {node, messageId: 'non-object-descriptor'};
		}

		return;
	}

	if (checkedDescriptors.has(descriptor)) {
		return;
	}

	checkedDescriptors.add(descriptor);
	const properties = getEffectiveProperties(descriptor, false, context);
	if (!properties) {
		return;
	}

	const hasAccessor = properties.has('get') || properties.has('set');
	if (hasAccessor && (properties.has('value') || properties.has('writable'))) {
		yield {node: descriptor, messageId: 'incompatible-fields'};
	}

	for (const [name, property] of properties) {
		if (!descriptorFields.has(name)) {
			const problem = {
				node: property.key,
				messageId: 'unknown-field',
				data: {name: typeof name === 'symbol' ? context.sourceCode.getText(property.key) : name},
			};
			if (name === 'writeable' && !hasAccessor && !properties.has('writable')) {
				const suggestion = getWriteableSuggestion(property, context);
				if (suggestion) {
					problem.suggest = [suggestion];
				}
			}

			yield problem;
			continue;
		}

		// Accessor syntax on the descriptor itself supplies the result of reading a field, not the function stored in the field.
		if (['get', 'set'].includes(name) && property.kind === 'init' && isNonCallableAccessor(property.value, context)) {
			yield {node: property.value, messageId: 'non-callable-accessor', data: {name}};
		}
	}
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const checkedDescriptors = new WeakSet();
	context.on('CallExpression', function * (node) {
		const argument = getDescriptorArgument(node, context);
		if (!argument) {
			return;
		}

		if (!argument.isMap) {
			yield * getDescriptorProblems(argument.node, context, checkedDescriptors);
			return;
		}

		const object = getObjectExpression(argument.node, true, context);
		const properties = object && getEffectiveProperties(object, true, context);
		if (!properties) {
			return;
		}

		for (const property of properties.values()) {
			if (property.kind === 'init') {
				yield * getDescriptorProblems(property.value, context, checkedDescriptors);
			}
		}
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow invalid property descriptors.',
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
