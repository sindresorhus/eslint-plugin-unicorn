import {findVariable} from '@eslint-community/eslint-utils';
import {
	escapeString,
	isTypeScriptExpressionWrapper,
	needsSemicolon,
	wouldRemoveComments,
} from './utils/index.js';
import {containsOptionalChain} from './utils/comparison.js';
import {
	getStaticStringValue,
	isMethodCall,
} from './ast/index.js';

const MESSAGE_ID = 'prefer-map-from-entries';
const messages = {
	[MESSAGE_ID]: 'Prefer `new Map()` over `Object.fromEntries()` when using the result as a map.',
};

const objectIterableMethods = [
	'entries',
	'keys',
	'values',
];

const inheritedObjectPropertyNames = new Set([
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
	'__proto__',
	'constructor',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'toLocaleString',
	'toString',
	'valueOf',
]);

function isGlobalNameAvailable(name, node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), name);
	return !variable || variable.defs.length === 0;
}

function isObjectFromEntriesCall(node, context) {
	return isMethodCall(node, {
		object: 'Object',
		method: 'fromEntries',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& !node.typeArguments
	&& !node.typeParameters
	&& !wouldRemoveComments(context, node.callee)
	&& isGlobalNameAvailable('Object', node, context)
	&& isGlobalNameAvailable('Map', node, context)
	&& isKnownStringKeyEntries(node.arguments[0], context);
}

function isObjectEntriesCall(node, context) {
	return isMethodCall(node, {
		object: 'Object',
		method: 'entries',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& isGlobalNameAvailable('Object', node, context);
}

function isStringKeyEntry(node) {
	if (node?.type !== 'ArrayExpression') {
		return false;
	}

	const key = getStaticStringValue(node.elements[0]);
	return node.elements.length >= 2
		&& node.elements[0]
		&& node.elements[0].type !== 'SpreadElement'
		&& key !== undefined
		&& !isArrayIndexPropertyName(key);
}

function isArrayIndexPropertyName(key) {
	const number = Number(key);
	return Number.isSafeInteger(number)
		&& number >= 0
		&& number <= (2 ** 32) - 2
		&& String(number) === key;
}

function isStringKeyEntriesArray(node) {
	return node.type === 'ArrayExpression'
		&& node.elements.length > 0
		&& node.elements.every(element => element?.type !== 'SpreadElement' && isStringKeyEntry(element));
}

function isKnownStringKeyEntries(node, context) {
	return isObjectEntriesCall(node, context)
		|| isStringKeyEntriesArray(node);
}

function getStaticPropertyName(memberExpression) {
	if (memberExpression.optional) {
		return;
	}

	if (!memberExpression.computed) {
		return memberExpression.property.type === 'Identifier' ? memberExpression.property.name : undefined;
	}

	const propertyName = getStaticStringValue(memberExpression.property);
	return propertyName !== undefined && !isArrayIndexPropertyName(propertyName) ? propertyName : undefined;
}

function isStandaloneExpression(node) {
	return node.parent.type === 'ExpressionStatement'
		&& node.parent.expression === node;
}

function isFirstTokenOfExpressionStatement(node, context) {
	let currentNode = node;
	const {sourceCode} = context;
	while (currentNode.parent) {
		if (currentNode.parent.type === 'ExpressionStatement') {
			return sourceCode.getRange(sourceCode.getFirstToken(currentNode.parent.expression))[0] === sourceCode.getRange(sourceCode.getFirstToken(node))[0];
		}

		currentNode = currentNode.parent;
	}

	return false;
}

function isCallLikeTarget(node) {
	return (
		(node.parent.type === 'CallExpression' || node.parent.type === 'NewExpression')
		&& node.parent.callee === node
	)
	|| (
		node.parent.type === 'TaggedTemplateExpression'
		&& node.parent.tag === node
	);
}

function isForInOrOfTarget(node) {
	return (
		node.parent.type === 'ForInStatement'
		|| node.parent.type === 'ForOfStatement'
	)
	&& node.parent.left === node;
}

function isAssignmentTarget(node) {
	return node.parent.type === 'AssignmentExpression'
		&& node.parent.left === node;
}

function isDeleteTarget(node) {
	return node.parent.type === 'UnaryExpression'
		&& node.parent.operator === 'delete'
		&& node.parent.argument === node;
}

function isUpdateTarget(node) {
	return node.parent.type === 'UpdateExpression'
		&& node.parent.argument === node;
}

function isWithinNewExpressionCallee(node) {
	while (node.parent) {
		const {parent} = node;
		if (parent.type === 'NewExpression') {
			return parent.callee === node;
		}

		if (isUnsupportedTypeScriptExpressionWrapper(parent)) {
			node = parent;
			continue;
		}

		if (
			parent.type !== 'MemberExpression'
			|| parent.object !== node
		) {
			return false;
		}

		node = parent;
	}

	return false;
}

function isInDestructuringPattern(node) {
	while (node.parent) {
		if (
			node.parent.type === 'ArrayPattern'
			|| node.parent.type === 'ObjectPattern'
		) {
			return true;
		}

		node = node.parent;
	}

	return false;
}

function isWithinChainExpression(node) {
	while (node.parent) {
		if (node.parent.type === 'ChainExpression') {
			return true;
		}

		if (node.parent.type === 'Program') {
			return false;
		}

		node = node.parent;
	}

	return false;
}

function getCallArgumentText(node, context) {
	const text = context.sourceCode.getText(node);
	return node.type === 'SequenceExpression' ? `(${text})` : text;
}

function isUnsupportedTypeScriptExpressionWrapper(node) {
	return isTypeScriptExpressionWrapper(node)
		|| node?.type === 'TSInstantiationExpression';
}

function getObjectMethodCall(identifier, context) {
	const {parent} = identifier;

	if (
		parent.type !== 'CallExpression'
		|| !isMethodCall(parent, {
			object: 'Object',
			methods: ['hasOwn', ...objectIterableMethods],
			optionalCall: false,
			optionalMember: false,
		})
		|| !isGlobalNameAvailable('Object', parent, context)
		|| wouldRemoveComments(context, parent)
	) {
		return;
	}

	const [object] = parent.arguments;
	if (object !== identifier) {
		return;
	}

	const {name} = parent.callee.property;
	if (name === 'hasOwn') {
		if (
			parent.arguments.length !== 2
			|| parent.arguments[1].type === 'SpreadElement'
		) {
			return;
		}

		const key = getStaticStringValue(parent.arguments[1]);
		if (key === undefined) {
			return;
		}

		return {
			node: parent,
			fixRange: context.sourceCode.getRange(parent),
			getReplacement: () => `${identifier.name}.has(${escapeString(key)})`,
		};
	}

	if (parent.arguments.length !== 1) {
		return;
	}

	return {
		node: parent,
		fixRange: context.sourceCode.getRange(parent),
		getReplacement() {
			const replacement = `[...${identifier.name}.${name}()]`;
			const semicolon = isFirstTokenOfExpressionStatement(parent, context) && needsSemicolon(context.sourceCode.getTokenBefore(parent), context, replacement) ? ';' : '';
			return semicolon + replacement;
		},
	};
}

function getAssignmentOperation(memberExpression, identifier, key, context) {
	const assignmentExpression = memberExpression.parent;
	if (
		assignmentExpression.operator !== '='
		|| !isStandaloneExpression(assignmentExpression)
		|| wouldRemoveComments(context, assignmentExpression)
	) {
		return;
	}

	return {
		node: assignmentExpression,
		fixRange: context.sourceCode.getRange(assignmentExpression),
		getReplacement: () => `${identifier.name}.set(${key}, ${getCallArgumentText(assignmentExpression.right, context)})`,
	};
}

function getDeleteOperation(memberExpression, identifier, key, context) {
	const unaryExpression = memberExpression.parent;
	if (
		!isStandaloneExpression(unaryExpression)
		|| wouldRemoveComments(context, unaryExpression)
	) {
		return;
	}

	return {
		node: unaryExpression,
		fixRange: context.sourceCode.getRange(unaryExpression),
		getReplacement: () => `${identifier.name}.delete(${key})`,
	};
}

function getMemberExpressionOperation(identifier, context) {
	const {parent} = identifier;

	if (
		parent.type !== 'MemberExpression'
		|| parent.object !== identifier
		|| isUnsupportedTypeScriptExpressionWrapper(parent.parent)
		|| isInDestructuringPattern(parent)
		|| isWithinNewExpressionCallee(parent)
		|| containsOptionalChain(parent)
		|| isWithinChainExpression(parent)
		|| wouldRemoveComments(context, parent)
	) {
		return;
	}

	const propertyName = getStaticPropertyName(parent);
	if (
		propertyName === undefined
		|| inheritedObjectPropertyNames.has(propertyName)
	) {
		return;
	}

	const key = escapeString(propertyName);

	if (isAssignmentTarget(parent)) {
		return getAssignmentOperation(parent, identifier, key, context);
	}

	if (isDeleteTarget(parent)) {
		return getDeleteOperation(parent, identifier, key, context);
	}

	if (
		isUpdateTarget(parent)
		|| isCallLikeTarget(parent)
		|| isForInOrOfTarget(parent)
	) {
		return;
	}

	return {
		node: parent,
		fixRange: context.sourceCode.getRange(parent),
		getReplacement: () => `${identifier.name}.get(${key})`,
	};
}

function getOperation(identifier, context) {
	return getObjectMethodCall(identifier, context)
		?? getMemberExpressionOperation(identifier, context);
}

function hasOverlappingRanges(operations) {
	const sortedOperations = operations.toSorted((left, right) => left.fixRange[0] - right.fixRange[0]);

	for (const [index, operation] of sortedOperations.entries()) {
		const nextOperation = sortedOperations[index + 1];
		if (
			nextOperation
			&& operation.fixRange[1] > nextOperation.fixRange[0]
		) {
			return true;
		}
	}

	return false;
}

function getReferenceOperations(variable, context) {
	const operations = [];

	for (const reference of variable.references) {
		if (reference.init) {
			continue;
		}

		const operation = getOperation(reference.identifier, context);
		if (!operation) {
			return;
		}

		operations.push(operation);
	}

	if (
		operations.length === 0
		|| hasOverlappingRanges(operations)
	) {
		return;
	}

	return operations;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclarator', node => {
		if (
			node.id.type !== 'Identifier'
			|| node.id.typeAnnotation
			|| node.parent.kind !== 'const'
			|| node.parent.parent.type === 'ExportNamedDeclaration'
			|| !isObjectFromEntriesCall(node.init, context)
		) {
			return;
		}

		const variable = findVariable(context.sourceCode.getScope(node), node.id);
		if (
			!variable
			|| variable.defs.length !== 1
		) {
			return;
		}

		const operations = getReferenceOperations(variable, context);
		if (!operations) {
			return;
		}

		return {
			node: node.init,
			messageId: MESSAGE_ID,
			* fix(fixer) {
				yield fixer.replaceText(node.init.callee, 'new Map');

				for (const operation of operations) {
					yield fixer.replaceText(operation.node, operation.getReplacement());
				}
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
			description: 'Prefer `new Map()` over `Object.fromEntries()` when using the result as a map.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
