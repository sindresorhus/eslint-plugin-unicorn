import {isFunction} from './ast/index.js';
import {unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-using-resource-escape';
const messages = {
	[MESSAGE_ID]: 'Do not {{action}} resource `{{name}}` or a value that contains or captures it. The resource is disposed when its owning scope exits.',
};
const typeOnlyComputedKeyNodeTypes = new Set([
	'TSAbstractMethodDefinition',
	'TSMethodSignature',
	'TSPropertySignature',
]);

function getOwner(node) {
	for (let {parent} = node; parent; parent = parent.parent) {
		if (isFunction(parent) || parent.type === 'Program') {
			return parent;
		}
	}
}

function getUniqueDefinition(variable, definitionTypes) {
	const definitions = variable?.defs.filter(definition => definitionTypes.includes(definition.type));
	if (definitions?.length === 1) {
		return definitions[0];
	}
}

function findValueVariable(node, sourceCode) {
	let scope = sourceCode.getScope(node);
	while (scope) {
		const variable = scope.set.get(node.name);
		if (variable?.defs.some(definition => definition.type !== 'Type')) {
			return variable;
		}

		scope = scope.upper;
	}
}

function isOwnedResource(variable, owner) {
	const definition = getUniqueDefinition(variable, ['Variable']);
	return definition?.type === 'Variable'
		&& (definition.parent.kind === 'using' || definition.parent.kind === 'await using')
		&& getOwner(definition.node) === owner;
}

function getReferencedFunction(variable) {
	const definition = getUniqueDefinition(variable, ['Variable', 'FunctionName']);
	if (!definition) {
		return;
	}

	if (definition.type === 'FunctionName') {
		return definition.node;
	}

	if (
		definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& definition.node.id.type === 'Identifier'
	) {
		const initializer = unwrapTypeScriptExpression(definition.node.init);
		if (initializer && isFunction(initializer)) {
			return initializer;
		}
	}
}

function isTypeOnlyComputedKey(node) {
	if (typeOnlyComputedKeyNodeTypes.has(node.type)) {
		return true;
	}

	if (node.decorators?.length > 0) {
		return false;
	}

	return (
		node.type === 'TSAbstractAccessorProperty'
		|| node.type === 'TSAbstractPropertyDefinition'
		|| (node.type === 'PropertyDefinition' && node.declare === true)
	);
}

function isNonRuntimeReference(node) {
	for (let child = node; child.parent; child = child.parent) {
		const {parent} = child;
		if (parent.type === 'TSTypeQuery' || parent.type === 'JSXNamespacedName') {
			return true;
		}

		if (isTypeOnlyComputedKey(parent) && parent.key === child) {
			return true;
		}

		if (isFunction(parent) || parent.type === 'Program') {
			return false;
		}
	}

	return false;
}

function isRuntimeReference(reference) {
	// Some syntax is represented as a value reference without reading the binding at runtime.
	return reference.isValueReference !== false && !isNonRuntimeReference(reference.identifier);
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

function * getEscapingResources(node, owner, sourceCode) {
	if (!node) {
		return;
	}

	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Identifier') {
		const variable = findValueVariable(node, sourceCode);
		if (isOwnedResource(variable, owner)) {
			yield variable;
			return;
		}

		const functionNode = getReferencedFunction(variable);
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
				yield * getEscapingResources(element, owner, sourceCode);
			}

			break;
		}

		case 'ObjectExpression': {
			for (const property of node.properties) {
				if (property.type === 'Property') {
					yield * getEscapingResources(property.value, owner, sourceCode);
				}
			}

			break;
		}

		case 'ConditionalExpression': {
			yield * getEscapingResources(node.consequent, owner, sourceCode);
			yield * getEscapingResources(node.alternate, owner, sourceCode);
			break;
		}

		case 'LogicalExpression': {
			// Disposable values are truthy, so they cannot escape from the left of `&&`.
			if (node.operator !== '&&') {
				yield * getEscapingResources(node.left, owner, sourceCode);
			}

			yield * getEscapingResources(node.right, owner, sourceCode);
			break;
		}

		case 'SequenceExpression': {
			yield * getEscapingResources(node.expressions.at(-1), owner, sourceCode);
			break;
		}

		default: {
			break;
		}
	}
}

function getExportedValues(node) {
	if (node.type === 'TSExportAssignment') {
		return [node.expression];
	}

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
	const {sourceCode} = context;

	function * getProblems(node, values, action) {
		const owner = getOwner(node);
		const resources = new Set(values.flatMap(value => [...getEscapingResources(value, owner, sourceCode)]));
		for (const resource of resources) {
			yield {node, messageId: MESSAGE_ID, data: {name: resource.name, action}};
		}
	}

	// Scope analysis already includes forward references and writes later in the file.
	context.on('ReturnStatement', node => getProblems(node, [node.argument], 'return'));
	context.on(['ExportNamedDeclaration', 'ExportDefaultDeclaration', 'TSExportAssignment'], node => getProblems(node, getExportedValues(node), 'export'));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow returning or exporting resources declared with `using`, including through capturing functions.',
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
