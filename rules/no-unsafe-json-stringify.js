import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isFunction, isMethodCall} from './ast/index.js';
import {
	getConstVariableInitializer,
	getStaticValueIfNoSideEffects,
	isBigInt,
	isGlobalIdentifier,
	isMap,
	isSet,
	isWeakMap,
	isWeakSet,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {createTypeCheckers, target, unknown} from './utils/type-helpers.js';
import {isUniqueSymbolType} from './utils/types.js';

const MESSAGE_ID = 'no-unsafe-json-stringify';
const MESSAGE_ID_ARRAY = 'no-unsafe-json-stringify/array';
const MESSAGE_ID_OBJECT = 'no-unsafe-json-stringify/object';
const MESSAGE_ID_STRING = 'no-unsafe-json-stringify/string';
const messages = {
	[MESSAGE_ID]: '`JSON.stringify()` cannot faithfully serialize {{type}} values.',
	[MESSAGE_ID_ARRAY]: 'Convert the {{type}} to an array.',
	[MESSAGE_ID_OBJECT]: 'Convert the Map to an object (requires string keys).',
	[MESSAGE_ID_STRING]: 'Convert the BigInt to a string.',
};

const collectionCheckers = [
	['Map', isMap],
	['Set', isSet],
	['WeakMap', isWeakMap],
	['WeakSet', isWeakSet],
];

const {isTarget: isSymbol} = createTypeCheckers({
	targetTypeNames: new Set(),
	targetCallNames: ['Symbol'],
	isTargetNode: node => isMethodCall(node, {object: 'Symbol', method: 'for'}),
	isTargetTypeAnnotation: node => node?.type === 'TSSymbolKeyword',
	isTargetType: type => type.intrinsicName === 'symbol' || isUniqueSymbolType(type),
	getStaticType: value => typeof value === 'symbol' ? target : unknown,
});

function isFunctionSyntax(node, context) {
	if (isFunction(node) || node.type === 'ClassExpression') {
		return true;
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.length === 1
		&& ['FunctionName', 'ClassName'].includes(variable.defs[0].type)
		&& variable.references.every(reference => !(reference.isWrite() && !reference.init));
}

const {isTarget: isFunctionValue} = createTypeCheckers({
	targetTypeNames: new Set(),
	isTargetNode: isFunctionSyntax,
	isTargetTypeAnnotation: node => node?.type === 'TSFunctionType' || node?.type === 'TSConstructorType',
	isTargetType: type => type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0,
});

function getUnsafeType(node, context) {
	for (const [type, isType] of collectionCheckers) {
		if (isType(node, context)) {
			return type;
		}
	}

	if (isBigInt(node, context)) {
		return 'BigInt';
	}

	if (isFunctionValue(node, context)) {
		return 'function';
	}

	if (isSymbol(node, context)) {
		return 'symbol';
	}

	node = unwrapTypeScriptExpression(node);
	if (node.type === 'UnaryExpression' && node.operator === 'void') {
		return 'undefined';
	}

	const result = getStaticValueIfNoSideEffects(node, context);
	if (result) {
		if (result.value === undefined) {
			return 'undefined';
		}

		if (typeof result.value === 'number' && !Number.isFinite(result.value)) {
			return 'non-finite number';
		}
	}
}

function getProblem(node, type, context) {
	const problem = {node, messageId: MESSAGE_ID, data: {type}};
	const conversions = [];
	switch (type) {
		case 'Map': {
			conversions.push([MESSAGE_ID_ARRAY, 'Array.from'], [MESSAGE_ID_OBJECT, 'Object.fromEntries']);

			break;
		}

		case 'Set': {
			conversions.push([MESSAGE_ID_ARRAY, 'Array.from']);

			break;
		}

		case 'BigInt': {
			conversions.push([MESSAGE_ID_STRING, 'String']);

			break;
		}
	// No default
	}

	// Some unsafe values have no suggested conversion.
	if (conversions.length === 0) {
		return problem;
	}

	problem.suggest = conversions.map(([messageId, conversion]) => ({
		messageId,
		data: {type},
		fix(fixer) {
			const text = context.sourceCode.getText(node);
			const argument = node.type === 'SequenceExpression' ? `(${text})` : text;
			let replacement = `${conversion}(${argument})`;
			if (node.parent.type === 'Property' && node.parent.shorthand) {
				replacement = `${text}: ${replacement}`;
			}

			return fixer.replaceText(node, replacement);
		},
	}));
	return problem;
}

function * getProblems(node, context, {propertyNames, allowUndefined, visitedNodes = new Set()}) {
	const originalNode = node;
	node = unwrapTypeScriptExpression(node);
	if (visitedNodes.has(node)) {
		return;
	}

	visitedNodes = new Set(visitedNodes);
	visitedNodes.add(node);
	if (node.type === 'ArrayExpression') {
		for (const element of node.elements) {
			if (element && element.type !== 'SpreadElement') {
				yield * getProblems(element, context, {propertyNames, visitedNodes});
			}
		}
	} else if (node.type === 'ObjectExpression') {
		const properties = node.properties.map(property => ({
			property,
			name: property.type === 'Property' ? getPropertyName(property, context.sourceCode.getScope(property)) : undefined,
		}));
		const uniqueNames = new Set(properties.map(({name}) => name));
		// Spreads, unknown keys, duplicate keys, and custom serialization hooks can change what gets serialized.
		if (
			properties.every(({name}) => typeof name === 'string' && name !== 'toJSON' && name !== '__proto__')
			&& uniqueNames.size === properties.length
		) {
			for (const {property, name} of properties) {
				if (property.kind === 'init' && (!propertyNames || propertyNames.has(name))) {
					yield * getProblems(property.value, context, {propertyNames, allowUndefined: true, visitedNodes});
				}
			}
		}
	} else {
		const type = getUnsafeType(originalNode, context);
		if (type) {
			if (type !== 'undefined' || !allowUndefined) {
				yield getProblem(originalNode, type, context);
			}

			return;
		}

		const initializer = getConstVariableInitializer(node, context);
		if (initializer?.parent.id.type === 'Identifier') {
			// Report at the serialization site, and do not suggest changing a shared initializer.
			const [problem] = getProblems(initializer, context, {propertyNames, allowUndefined, visitedNodes});
			if (problem) {
				yield {node: originalNode, messageId: MESSAGE_ID, data: problem.data};
			}
		}
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', function * (node) {
		if (!isMethodCall(node, {object: 'JSON', minimumArguments: 1, maximumArguments: 3}) || getPropertyName(node.callee, context.sourceCode.getScope(node)) !== 'stringify') {
			return;
		}

		if (!isGlobalIdentifier(node.callee.object, context)) {
			return;
		}

		let propertyNames;
		const [, replacer] = node.arguments;
		if (replacer) {
			const result = getStaticValueIfNoSideEffects(replacer, context);
			if (!result || typeof result.value === 'function') {
				return;
			}

			if (Array.isArray(result.value)) {
				propertyNames = new Set(result.value.filter(value => typeof value === 'string' || typeof value === 'number').map(String));
			}
		}

		yield * getProblems(node.arguments[0], context, {propertyNames});
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
			description: 'Disallow known values that JSON serialization cannot represent faithfully.',
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
