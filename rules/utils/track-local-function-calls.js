import {isFunction, isInTypeQuery} from '../ast/index.js';
import unwrapTypeScriptExpression, {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';

const hasWrites = variable => variable.references.some(reference => !reference.init && reference.isWrite());
const isRuntimeReference = reference =>
	reference.isValueReference !== false
	&& !isInTypeQuery(reference.identifier);

function getOuterExpression(node) {
	while (isTypeScriptExpressionWrapper(node.parent)) {
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
		if (ancestor.type !== 'ClassBody') {
			continue;
		}

		const definition = ancestor.body.find(element => element.key?.type === 'PrivateIdentifier' && element.key.name === member.property.name);
		if (definition) {
			return definition.type === 'MethodDefinition' && definition.kind === 'method' ? definition.value : undefined;
		}
	}
}

function getTarget(targets, node) {
	if (!targets.has(node)) {
		targets.set(node, {
			node,
			calls: new Set(),
			excluded: false,
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
	if (scope.type === 'global' || hasWrites(variable) || isExportedDefinition(definition) || definition.node.decorators?.length || node.parent.decorators?.length) {
		target.excluded = true;
	}

	for (const reference of variable.references) {
		if (reference.init) {
			continue;
		}

		if (!isRuntimeReference(reference)) {
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
Track local functions whose runtime references are all direct calls. Query the returned function at Program exit. Exported functions, reassigned bindings, unknown callers, and files with dynamic scope are excluded. Explicit constructors and private methods are included.

@param {import('eslint').Rule.RuleContext} context
@returns {() => Iterable<{node: import('estree').Node, calls: Set<import('estree').Node>}>}
*/
export default function trackLocalFunctionCalls(context) {
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

	return function * () {
		if (hasDynamicScope) {
			return;
		}

		for (const target of getTargets(privateMembers, context).values()) {
			if (!target.excluded) {
				yield target;
			}
		}
	};
}
