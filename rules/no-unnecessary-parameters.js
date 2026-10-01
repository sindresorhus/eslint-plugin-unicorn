import {findVariable, isCommaToken} from '@eslint-community/eslint-utils';
import reservedIdentifiers from 'reserved-identifiers';
import {isFunction} from './ast/index.js';
import {getArgumentRemovalRange, removeObjectProperty, replaceReferenceIdentifier} from './fix/index.js';
import {
	getIndentUnit,
	getLinebreak,
	getLineIndent,
	getParenthesizedRange,
	hasCommentInRange,
	isParenthesized,
	isShorthandPropertyValue,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	unwrapTypeScriptExpression,
	isTypeScriptExpressionWrapper,
} from './utils/index.js';

const messages = {
	'same-value': 'Parameter `{{name}}` receives the same value at every call.',
	'always-default': 'Parameter `{{name}}` always receives its default value.',
	'always-undefined': 'Parameter `{{name}}` is always `undefined`.',
};

const reserved = reservedIdentifiers();

const isInside = (node, parent, context) => {
	const {sourceCode} = context;
	const [start, end] = sourceCode.getRange(node);
	const [parentStart, parentEnd] = sourceCode.getRange(parent);
	return start >= parentStart && end <= parentEnd;
};

const hasWrites = variable => variable.references.some(reference => !reference.init && reference.isWrite());
const isRuntimeReference = reference => {
	let node = reference.identifier;
	while (node.parent.type === 'TSQualifiedName') {
		node = node.parent;
	}

	return reference.isValueReference !== false && node.parent.type !== 'TSTypeQuery';
};

const getVariable = (node, context) => findVariable(context.sourceCode.getScope(node), node);
const undefinedValue = {kind: 'primitive', value: undefined};

function getPrimitiveValue(node) {
	if (node.type === 'Literal' && !node.regex) {
		return {kind: 'primitive', value: node.value, node};
	}

	if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
		return {kind: 'primitive', value: node.quasis[0].value.cooked, node};
	}

	if (node.type === 'UnaryExpression') {
		const argument = unwrapTypeScriptExpression(node.argument);
		if (argument.type === 'Literal') {
			if (node.operator === 'void' && argument.value === 0) {
				return {...undefinedValue, node};
			}

			if (typeof argument.value === 'number' && (node.operator === '-' || node.operator === '+')) {
				return {kind: 'primitive', value: node.operator === '-' ? -argument.value : argument.value, node};
			}

			if (typeof argument.value === 'bigint' && node.operator === '-') {
				return {kind: 'primitive', value: -argument.value, node};
			}
		}
	}
}

function getValue(node, context) {
	if (!node) {
		return undefinedValue;
	}

	node = unwrapTypeScriptExpression(node);
	const primitive = getPrimitiveValue(node);
	if (primitive) {
		return primitive;
	}

	if (node.type !== 'Identifier') {
		return;
	}

	const variable = getVariable(node, context);
	if (!variable || hasWrites(variable)) {
		return;
	}

	if (variable.defs.length === 0) {
		if (variable.name === 'undefined') {
			return {...undefinedValue, node};
		}

		if (variable.writeable === false) {
			return {kind: 'binding', variable, node};
		}

		return;
	}

	const [definition] = variable.defs;
	if (variable.defs.length !== 1
		|| definition.kind === 'var'
		|| definition.node.declare
		|| definition.parent?.declare
		|| definition.node.type === 'TSDeclareFunction'
		|| !['Variable', 'FunctionName', 'ClassName', 'Parameter', 'CatchClause'].includes(definition.type)) {
		return;
	}

	return {kind: 'binding', variable, node};
}

const isUndefined = value => value?.kind === 'primitive' && value.value === undefined;
const isSameValue = (first, second) => first?.kind === second?.kind && (
	first.kind === 'binding' ? first.variable === second.variable : Object.is(first.value, second.value)
);

function getOuterExpression(node) {
	while (isTypeScriptExpressionWrapper(node.parent) || node.parent.type === 'TSInstantiationExpression') {
		node = node.parent;
	}

	return node;
}

function getCall(node) {
	node = getOuterExpression(node);
	const {parent} = node;
	if ((parent.type === 'CallExpression' || parent.type === 'NewExpression') && parent.callee === node) {
		return parent;
	}
}

function getPropertyName(property) {
	if (property.type !== 'Property') {
		return;
	}

	if (!property.computed && property.key.type === 'Identifier') {
		return property.key.name;
	}

	if (property.key.type === 'Literal' && (typeof property.key.value === 'string' || typeof property.key.value === 'number')) {
		return String(property.key.value);
	}
}

function getProperties(node) {
	const properties = new Map();
	for (const property of node.properties) {
		if (property.type === 'RestElement' && node.type === 'ObjectPattern') {
			continue;
		}

		const name = getPropertyName(property);
		if (name === undefined || name === '__proto__' || properties.has(name) || property.method || property.kind !== 'init') {
			return;
		}

		properties.set(name, property);
	}

	return properties;
}

function * getParameters(functionNode, context) {
	let index = 0;
	for (const parameter of functionNode.params) {
		if (parameter.type === 'Identifier' && parameter.name === 'this') {
			continue;
		}

		const position = index++;
		const pattern = parameter.type === 'AssignmentPattern' ? parameter.left : parameter;
		const defaultNode = parameter.type === 'AssignmentPattern' ? parameter.right : undefined;
		if (pattern.type === 'Identifier') {
			yield {
				node: parameter, identifier: pattern, variable: getVariable(pattern, context), index: position, defaultNode,
			};
			continue;
		}

		if (pattern.type !== 'ObjectPattern' || (defaultNode && (defaultNode.type !== 'ObjectExpression' || defaultNode.properties.length > 0))) {
			continue;
		}

		const properties = getProperties(pattern);
		if (!properties) {
			continue;
		}

		for (const [name, property] of properties) {
			const {value} = property;
			const identifier = value.type === 'AssignmentPattern' ? value.left : value;
			if (identifier.type === 'Identifier') {
				yield {
					node: property,
					identifier,
					variable: getVariable(identifier, context),
					index: position,
					propertyName: name,
					defaultNode: value.type === 'AssignmentPattern' ? value.right : undefined,
					parameter,
				};
			}
		}
	}
}

function getArguments(target, parameter, context) {
	const arguments_ = [];
	for (const call of target.calls) {
		if (call.arguments.slice(0, parameter.index + 1).some(argument => argument.type === 'SpreadElement')) {
			return;
		}

		const argument = call.arguments[parameter.index];
		if (parameter.propertyName !== undefined) {
			let object = unwrapTypeScriptExpression(argument);
			if ((!object || isUndefined(getValue(object, context))) && parameter.parameter.type === 'AssignmentPattern') {
				object = parameter.parameter.right;
			}

			if (object?.type !== 'ObjectExpression') {
				return;
			}

			const properties = getProperties(object);
			if (!properties) {
				return;
			}

			const property = properties.get(parameter.propertyName);
			// A missing own property can still be inherited from Object.prototype.
			if (!property && Object.hasOwn(Object.prototype, parameter.propertyName)) {
				return;
			}

			arguments_.push({node: property, value: getValue(property?.value, context)});
			continue;
		}

		const unwrapped = unwrapTypeScriptExpression(argument);
		if (unwrapped?.type === 'Identifier' && isInside(call, target.node, context) && getVariable(unwrapped, context) === parameter.variable) {
			if (hasWrites(parameter.variable)) {
				return;
			}

			arguments_.push({node: argument, forwarding: true});
			continue;
		}

		arguments_.push({node: argument, value: getValue(argument, context)});
	}

	return arguments_;
}

function getParameterValue(parameter, arguments_, context) {
	const incoming = arguments_.filter(argument => !argument.forwarding);
	if (incoming.some(argument => !argument.value)) {
		return;
	}

	const defaultValue = parameter.defaultNode ? getValue(parameter.defaultNode, context) : undefinedValue;
	if (incoming.every(argument => isUndefined(argument.value))) {
		return {messageId: parameter.defaultNode ? 'always-default' : 'always-undefined', value: defaultValue, arguments_};
	}

	const values = incoming.map(argument => isUndefined(argument.value) ? defaultValue : argument.value);
	const [value] = values;
	if (!value || values.some(other => !other || !isSameValue(value, other))) {
		return;
	}

	if (value.kind === 'binding' && findVariable(context.sourceCode.getScope(parameter.identifier).upper, value.variable.name) !== value.variable) {
		return;
	}

	return {messageId: parameter.defaultNode && defaultValue && isSameValue(value, defaultValue) ? 'always-default' : 'same-value', value, arguments_};
}

function getParameterRemoval(parameter, context) {
	const {sourceCode} = context;
	const functionNode = parameter.node.parent;
	if (functionNode.type === 'ArrowFunctionExpression' && functionNode.params.length === 1 && !isParenthesized(parameter.node, context)) {
		return {removalRange: sourceCode.getRange(parameter.node), replacement: '()'};
	}

	const parameters = functionNode.params;
	const index = parameters.indexOf(parameter.node);
	let [start, end] = sourceCode.getRange(parameter.node);
	if (index < parameters.length - 1) {
		const comma = sourceCode.getTokenAfter(parameter.node);
		[end] = sourceCode.getRange(sourceCode.getTokenAfter(comma, {includeComments: true}));
	} else if (index > 0) {
		[start] = sourceCode.getRange(sourceCode.getTokenBefore(parameter.node));
	} else {
		const token = sourceCode.getTokenAfter(parameter.node);
		if (isCommaToken(token)) {
			[, end] = sourceCode.getRange(token);
		}
	}

	return {removalRange: [start, end], replacement: ''};
}

function hasTypedSignature(target) {
	const {node} = target;
	return Boolean(
		target.hasTypeUses
		|| node.returnType
		|| node.typeParameters
		|| node.params.some(parameter => parameter.typeAnnotation || parameter.left?.typeAnnotation || parameter.type === 'TSParameterProperty')
		|| target.variables.some(variable => variable.defs.some(definition =>
			definition.type === 'Variable' && (definition.node.id.typeAnnotation || (definition.node.init !== node && definition.node.init.type !== 'ClassExpression')))),
	);
}

function getLocalDefault(parameter, target, arguments_, context) {
	const defaultNode = unwrapTypeScriptExpression(parameter.defaultNode);
	const {node} = target;
	if (
		!defaultNode
		|| defaultNode.type !== 'Identifier'
		|| parameter.propertyName !== undefined
		|| reserved.has(parameter.identifier.name)
		|| node.async
		|| node.generator
		|| node.params.at(-1) !== parameter.node
		|| arguments_.some(argument => argument.forwarding)
		|| (node.body.type !== 'BlockStatement' && arguments_.some(argument => argument.node && isInside(argument.node, node.body, context)))
		|| parameter.variable.defs.length !== 1
	) {
		return;
	}

	const variable = getVariable(defaultNode, context);
	if (
		!variable
		|| variable === parameter.variable
		|| variable.defs.length !== 1
		|| variable.defs[0].type !== 'Parameter'
		|| variable.defs[0].node !== node
		|| findVariable(context.sourceCode.getScope(node.body), variable.name) !== variable
	) {
		return;
	}

	return `${hasWrites(parameter.variable) ? 'let' : 'const'} ${parameter.identifier.name} = ${context.sourceCode.getText(parameter.defaultNode)};`;
}

function getReplacementText(identifier, value, context) {
	const expression = getOuterExpression(identifier);

	let text;
	if (isUndefined(value)) {
		text = '(void 0)';
	} else {
		text = value.kind === 'binding' ? value.variable.name : context.sourceCode.getText(value.node);
	}

	if (
		value.kind === 'primitive'
		&& value.node
		&& ((value.node.type === 'UnaryExpression' && !isUndefined(value))
			|| (expression.parent.type === 'MemberExpression' && expression.parent.object === expression && shouldAddParenthesesToMemberExpressionObject(value.node, context))
			|| (expression.parent.type === 'NewExpression' && expression.parent.callee === expression)
			|| (expression.parent.type === 'ExpressionStatement' && typeof value.value === 'string'))
	) {
		text = `(${text})`;
	}

	const {sourceCode} = context;
	const statement = sourceCode.getAncestors(identifier).findLast(ancestor => ancestor.type === 'ExpressionStatement');

	if (
		statement
		&& sourceCode.getRange(sourceCode.getFirstToken(statement))[0] === sourceCode.getRange(identifier)[0]
		&& needsSemicolon(sourceCode.getTokenBefore(identifier), context, text)
	) {
		text = `;${text}`;
	}

	return text;
}

function canInlineValue(parameter, result, context) {
	const {sourceCode} = context;
	const {value, arguments_} = result;
	if (!value || hasWrites(parameter.variable) || parameter.variable.references.some(({identifier}) =>
		identifier.type === 'JSXIdentifier' || (identifier.name === '__proto__' && isShorthandPropertyValue(identifier)))) {
		return false;
	}

	if (value.kind !== 'binding') {
		// Legacy literals from non-strict scopes can become invalid in strict code.
		return !value.node || sourceCode.getScope(value.node).isStrict || parameter.variable.references.every(reference => !sourceCode.getScope(reference.identifier).isStrict);
	}

	if (value.variable.scope.type === 'global' || reserved.has(value.variable.name)) {
		return false;
	}

	// Keep binding-valued defaults in parameter scope; only the local-default transformation can move them.
	if (result.messageId === 'always-default') {
		return false;
	}

	const definition = value.variable.defs[0];
	// Parameter and catch bindings may be uninitialized, and parameters can change through a mapped arguments object.
	if (['Parameter', 'CatchClause'].includes(definition.type)) {
		return false;
	}

	if (definition.type === 'Variable' && !definition.node.init) {
		return false;
	}

	// A declaration in another switch case may not have been initialized.
	if ((definition.type === 'Variable' || definition.type === 'ClassName')
		&& (value.variable.scope.type === 'switch' || arguments_.some(argument => argument.node && (
			sourceCode.getScope(argument.node).variableScope !== value.variable.scope.variableScope
			|| sourceCode.getRange(definition.node)[1] > sourceCode.getRange(argument.node)[0]
		)))) {
		return false;
	}

	for (const reference of parameter.variable.references) {
		const resolved = findVariable(sourceCode.getScope(reference.identifier), value.variable.name);
		if (resolved !== value.variable && resolved !== parameter.variable) {
			return false;
		}
	}

	return true;
}

function getFix(parameter, result, target, context) {
	const {sourceCode} = context;
	const {value, messageId, arguments_} = result;
	if (hasTypedSignature(target) || parameter.variable.defs.length !== 1 || parameter.variable.references.some(reference => !isRuntimeReference(reference))) {
		return;
	}

	// Keep parameter-initializer dependencies intact, including their temporal dead zones.
	if (parameter.variable.references.some(reference => !reference.init
		&& !isInside(reference.identifier, target.node.body, context)
		&& !isInside(reference.identifier, parameter.node, context))) {
		return;
	}

	const localDefault = messageId === 'always-default' ? getLocalDefault(parameter, target, arguments_, context) : undefined;
	if (!localDefault && !canInlineValue(parameter, result, context)) {
		return;
	}

	const removals = arguments_.map(argument => argument.node).filter(node => node && !isInside(node, parameter.node, context));
	const ranges = parameter.propertyName === undefined
		? [getParameterRemoval(parameter, context), ...removals.map(node => ({removalRange: getArgumentRemovalRange(node, context), replacement: ''}))]
		: [];
	if (
		hasCommentInRange(context, [sourceCode.getRange(target.node)[0], sourceCode.getRange(target.node.body)[0]])
		|| (localDefault && sourceCode.getCommentsInside(target.node.body).length > 0)
		|| [...target.calls].some(call => sourceCode.getCommentsInside(call).length > 0)
		|| ranges.some(({removalRange}) => hasCommentInRange(context, removalRange))
	) {
		return;
	}

	if (!localDefault && parameter.variable.references.some(reference => {
		const {parent} = getOuterExpression(reference.identifier);
		return parent.type === 'UnaryExpression' && parent.operator === 'delete';
	})) {
		return;
	}

	return function * (fixer) {
		if (parameter.propertyName === undefined) {
			for (const {removalRange, replacement} of ranges) {
				yield fixer.replaceTextRange(removalRange, replacement);
			}
		} else {
			yield removeObjectProperty(fixer, parameter.node, context);
			for (const node of removals) {
				yield removeObjectProperty(fixer, node, context);
			}
		}

		if (localDefault) {
			const {body} = target.node;
			const linebreak = getLinebreak(context);
			const indent = getLineIndent(target.node, context);
			const bodyIndent = indent + getIndentUnit(context);
			if (body.type !== 'BlockStatement') {
				const expression = sourceCode.text.slice(...getParenthesizedRange(body, context));
				yield fixer.replaceTextRange(getParenthesizedRange(body, context), `{${linebreak}${bodyIndent}${localDefault}${linebreak}${bodyIndent}return ${expression};${linebreak}${indent}}`);
				return;
			}

			const directives = body.body.filter(statement => statement.directive);
			const anchor = directives.at(-1) ?? sourceCode.getFirstToken(body);
			const nextToken = sourceCode.getTokenAfter(anchor);
			const gap = sourceCode.text.slice(sourceCode.getRange(anchor)[1], sourceCode.getRange(nextToken)[0]);
			const suffix = /[\n\r]/.test(gap) ? '' : linebreak + (nextToken.value === '}' ? indent : bodyIndent);
			yield fixer.insertTextAfter(anchor, `${linebreak}${bodyIndent}${localDefault}${suffix}`);
			return;
		}

		for (const reference of parameter.variable.references) {
			const {identifier} = reference;
			if (reference.init || isInside(identifier, parameter.node, context) || removals.some(node => isInside(identifier, node, context))) {
				continue;
			}

			yield replaceReferenceIdentifier(identifier, getReplacementText(identifier, value, context), context, fixer);
		}
	};
}

function getFunctionFromDefinition(definition) {
	if (definition.type === 'FunctionName') {
		return definition.node;
	}

	if (definition.type === 'Variable' && definition.node.id.type === 'Identifier') {
		const initializer = unwrapTypeScriptExpression(definition.node.init);
		if (initializer && isFunction(initializer)) {
			return initializer;
		}

		if (initializer?.type === 'ClassExpression' && !initializer.decorators?.length) {
			return initializer.body.body.find(member => member.type === 'MethodDefinition' && member.kind === 'constructor')?.value;
		}
	}

	if (definition.type === 'ClassName') {
		return definition.node.body.body.find(member => member.type === 'MethodDefinition' && member.kind === 'constructor')?.value;
	}
}

function isExportedDefinition(definition) {
	let {node} = definition;
	if (node.type === 'VariableDeclarator') {
		node = node.parent;
	}

	return node.parent?.type === 'ExportNamedDeclaration' || node.parent?.type === 'ExportDefaultDeclaration';
}

function getPrivateMethodFunction(member) {
	for (let ancestor = member.parent; ancestor; ancestor = ancestor.parent) {
		if (ancestor.type !== 'ClassDeclaration' && ancestor.type !== 'ClassExpression') {
			continue;
		}

		const definition = ancestor.body.body.find(element => element.key?.type === 'PrivateIdentifier' && element.key.name === member.property.name);
		if (definition) {
			return definition.type === 'MethodDefinition' && definition.kind === 'method' ? definition.value : undefined;
		}
	}
}

function getTarget(targets, node) {
	if (!targets.has(node)) {
		targets.set(node, {
			node,
			variables: [],
			calls: new Set(),
			excluded: false,
			hasTypeUses: false,
		});
	}

	return targets.get(node);
}

function addVariableTarget(variable, scope, targets) {
	if (variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	const node = getFunctionFromDefinition(definition);
	if (!node?.body) {
		return;
	}

	const target = getTarget(targets, node);
	target.variables.push(variable);
	if (scope.type === 'global' || hasWrites(variable) || isExportedDefinition(definition) || definition.node.decorators?.length || node.parent.decorators?.length) {
		target.excluded = true;
	}

	for (const reference of variable.references) {
		if (reference.init) {
			continue;
		}

		if (!isRuntimeReference(reference)) {
			target.hasTypeUses = true;
			continue;
		}

		const call = getCall(reference.identifier);
		if (!call || (definition.type === 'ClassName' && call.type !== 'NewExpression')) {
			target.excluded = true;
		} else {
			target.calls.add(call);
		}
	}
}

function getTargets(privateMembers, context) {
	const targets = new Map();
	for (const scope of context.sourceCode.scopeManager.scopes) {
		for (const variable of scope.variables) {
			addVariableTarget(variable, scope, targets);
		}
	}

	for (const member of privateMembers) {
		const node = getPrivateMethodFunction(member);
		if (!node?.body) {
			continue;
		}

		const target = getTarget(targets, node);
		const call = getCall(member);
		if (!call || node.parent.decorators?.length) {
			target.excluded = true;
		} else {
			target.calls.add(call);
		}
	}

	return targets;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const privateMembers = [];
	let hasDynamicScope = false;

	context.on('WithStatement', () => {
		hasDynamicScope = true;
	});
	context.on('FunctionDeclaration', node => {
		const scope = sourceCode.getScope(node.parent);
		// Non-strict block declarations can have outer aliases missing from scope references.
		if (!scope.isStrict && scope !== scope.variableScope) {
			hasDynamicScope = true;
		}
	});
	context.on('CallExpression', node => {
		const callee = unwrapTypeScriptExpression(node.callee);
		if (callee.type === 'Identifier' && callee.name === 'eval') {
			hasDynamicScope = true;
		}
	});
	context.on('MemberExpression', node => {
		if (node.property.type === 'PrivateIdentifier') {
			privateMembers.push(node);
		}
	});

	context.onExit('Program', function * () {
		if (hasDynamicScope) {
			return;
		}

		for (const target of getTargets(privateMembers, context).values()) {
			const {node} = target;
			const scope = sourceCode.scopeManager.acquire(node, true);
			const argumentsVariable = scope?.set.get('arguments');
			if (
				target.excluded
				|| node.params.some(parameter => parameter.decorators?.length > 0)
				|| argumentsVariable?.references.length > 0
				|| [...target.calls].filter(call => !isInside(call, node, context)).length < context.options[0].minimumCallCount
			) {
				continue;
			}

			let hasFix = false;
			for (const parameter of getParameters(node, context)) {
				if (!parameter.variable) {
					continue;
				}

				const arguments_ = getArguments(target, parameter, context);
				const result = arguments_ && getParameterValue(parameter, arguments_, context);
				if (!result) {
					continue;
				}

				const fix = hasFix ? undefined : getFix(parameter, result, target, context);
				hasFix ||= Boolean(fix);
				yield {
					node: parameter.identifier, messageId: result.messageId, data: {name: parameter.identifier.name}, fix,
				};
			}
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow parameters that receive the same value at every call.',
			recommended: false,
		},
		fixable: 'code',
		schema: [{
			type: 'object',
			properties: {
				minimumCallCount: {
					type: 'integer',
					minimum: 1,
					description: 'Minimum number of external call sites required to check a function.',
				},
			},
			additionalProperties: false,
		}],
		defaultOptions: [{minimumCallCount: 2}],
		messages,
		languages: ['js/js'],
	},
};

export default config;
