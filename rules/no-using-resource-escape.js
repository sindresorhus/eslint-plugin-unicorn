import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction} from './ast/index.js';
import {getConstVariableInitializer, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-using-resource-escape';
const messages = {
	[MESSAGE_ID]: 'Do not {{action}} resource `{{name}}` or a function capturing it. The resource is disposed when its owning scope exits.',
};

function getOwner(node) {
	for (let {parent} = node; parent; parent = parent.parent) {
		if (isFunction(parent) || parent.type === 'Program') {
			return parent;
		}
	}
}

function isOwnedResource(variable, owner) {
	if (variable?.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;
	return definition.type === 'Variable'
		&& (definition.parent.kind === 'using' || definition.parent.kind === 'await using')
		&& getOwner(definition.node) === owner;
}

function getReferencedFunction(node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (variable?.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	if (definition.type === 'FunctionName') {
		return definition.node;
	}

	if (definition.type === 'Variable' && definition.node.id.type === 'Identifier') {
		const initializer = unwrapTypeScriptExpression(getConstVariableInitializer(node, context));
		if (initializer && isFunction(initializer)) {
			return initializer;
		}
	}
}

function isRuntimeReference(reference) {
	let node = reference.identifier;
	while (node.parent.type === 'TSQualifiedName') {
		node = node.parent;
	}

	// Type queries resolve in the value namespace but do not evaluate the resource.
	return reference.isValueReference !== false && node.parent.type !== 'TSTypeQuery';
}

function * getCapturedResources(node, owner, sourceCode) {
	if (node.type === 'FunctionDeclaration') {
		const variable = sourceCode.getDeclaredVariables(node).find(variable => variable.identifiers.includes(node.id));
		if (variable?.references.some(reference => reference.isWrite())) {
			return;
		}
	}

	for (const reference of sourceCode.getScope(node).through) {
		if (isRuntimeReference(reference) && isOwnedResource(reference.resolved, owner)) {
			yield reference.resolved;
		}
	}
}

function * getEscapingResources(node, owner, context) {
	if (!node) {
		return;
	}

	node = unwrapTypeScriptExpression(node);
	const {sourceCode} = context;

	if (node.type === 'Identifier') {
		const variable = findVariable(sourceCode.getScope(node), node);
		if (isOwnedResource(variable, owner)) {
			yield variable;
			return;
		}

		const functionNode = getReferencedFunction(node, context);
		if (!functionNode) {
			return;
		}

		node = functionNode;
	}

	if (isFunction(node)) {
		yield * getCapturedResources(node, owner, sourceCode);
		return;
	}

	switch (node.type) {
		case 'ArrayExpression': {
			for (const element of node.elements) {
				yield * getEscapingResources(element, owner, context);
			}

			break;
		}

		case 'ObjectExpression': {
			for (const property of node.properties) {
				if (property.type === 'Property') {
					yield * getEscapingResources(property.value, owner, context);
				}
			}

			break;
		}

		case 'ConditionalExpression': {
			yield * getEscapingResources(node.consequent, owner, context);
			yield * getEscapingResources(node.alternate, owner, context);
			break;
		}

		case 'LogicalExpression': {
			// Disposable values are truthy, so they cannot escape from the left of `&&`.
			if (node.operator !== '&&') {
				yield * getEscapingResources(node.left, owner, context);
			}

			yield * getEscapingResources(node.right, owner, context);
			break;
		}

		case 'SequenceExpression': {
			yield * getEscapingResources(node.expressions.at(-1), owner, context);
			break;
		}

		default: {
			break;
		}
	}
}

function getExportedValues(node) {
	if (node.source || node.exportKind === 'type') {
		return [];
	}

	if (node.type === 'ExportDefaultDeclaration') {
		return [node.declaration];
	}

	const {declaration} = node;
	if (declaration?.kind === 'const') {
		return declaration.declarations.filter(declarator => declarator.id.type === 'Identifier').map(declarator => declarator.init);
	}

	if (declaration && isFunction(declaration)) {
		return [declaration];
	}

	return node.specifiers.filter(specifier => specifier.exportKind !== 'type').map(specifier => specifier.local);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	function * getProblems(node, values, action) {
		const owner = getOwner(node);
		const resources = new Set(values.flatMap(value => [...getEscapingResources(value, owner, context)]));
		for (const resource of resources) {
			yield {node, messageId: MESSAGE_ID, data: {name: resource.name, action}};
		}
	}

	// Scope analysis already includes forward references and writes later in the file.
	context.on('ReturnStatement', node => getProblems(node, [node.argument], 'return'));
	context.on(['ExportNamedDeclaration', 'ExportDefaultDeclaration'], node => getProblems(node, getExportedValues(node), 'export'));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow returning or exporting resources declared with `using`.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
