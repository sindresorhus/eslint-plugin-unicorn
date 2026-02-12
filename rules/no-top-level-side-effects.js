const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects in modules.',
};

const esmExportTypes = new Set([
	'ExportNamedDeclaration',
	'ExportDefaultDeclaration',
	'ExportAllDeclaration',
]);

const hasExports = body => body.some(node => esmExportTypes.has(node.type));

const hasCjsExports = body => body.some(node => {
	if (node.type !== 'ExpressionStatement') {
		return false;
	}

	const {expression} = node;
	if (expression.type !== 'AssignmentExpression') {
		return false;
	}

	const {left} = expression;

	// `module.exports = ...` or `module.exports.foo = ...`
	if (left.type === 'MemberExpression') {
		const rootName = getRootIdentifier(left);
		if (rootName === 'module' || rootName === 'exports') {
			return true;
		}
	}

	return false;
});

/**
Get the root object name from a member expression chain.
`a.b.c` → 'a', `a` → 'a'.
*/
const getRootIdentifier = node => {
	if (node.type === 'Identifier') {
		return node.name;
	}

	if (node.type === 'MemberExpression') {
		return getRootIdentifier(node.object);
	}
};

/**
Collect identifier names from a binding pattern (handles destructuring).
*/
const collectBindingNames = (pattern, names) => {
	switch (pattern.type) {
		case 'Identifier': {
			names.add(pattern.name);
			break;
		}

		case 'ObjectPattern': {
			for (const property of pattern.properties) {
				collectBindingNames(
					property.type === 'RestElement' ? property.argument : property.value,
					names,
				);
			}

			break;
		}

		case 'ArrayPattern': {
			for (const element of pattern.elements) {
				if (element) {
					collectBindingNames(
						element.type === 'RestElement' ? element.argument : element,
						names,
					);
				}
			}

			break;
		}

		case 'AssignmentPattern': {
			collectBindingNames(pattern.left, names);
			break;
		}

		// No default
	}
};

/**
Collect names declared locally at the top level of the program body.
Includes variable declarations, function declarations, and class declarations.
Imported bindings are excluded — mutating imports is a side effect.
*/
const getTopLevelLocalNames = body => {
	const names = new Set();

	for (const node of body) {
		switch (node.type) {
			case 'VariableDeclaration': {
				for (const declarator of node.declarations) {
					collectBindingNames(declarator.id, names);
				}

				break;
			}

			case 'FunctionDeclaration':
			case 'ClassDeclaration': {
				if (node.id) {
					names.add(node.id.name);
				}

				break;
			}

			case 'ExportNamedDeclaration':
			case 'ExportDefaultDeclaration': {
				const {declaration} = node;
				if (declaration?.type === 'VariableDeclaration') {
					for (const declarator of declaration.declarations) {
						collectBindingNames(declarator.id, names);
					}
				} else if (declaration?.id) {
					names.add(declaration.id.name);
				}

				break;
			}

			// ImportDeclaration intentionally excluded — imports are not local

			// No default
		}
	}

	return names;
};

/**
Top-level statement types that are always safe (declarations, exports, imports).
*/
const safeStatementTypes = new Set([
	'VariableDeclaration',
	'FunctionDeclaration',
	'ClassDeclaration',
	'ImportDeclaration',
	'ExportNamedDeclaration',
	'ExportAllDeclaration',
	'EmptyStatement',
]);

const safeDefaultExportTypes = new Set([
	'FunctionDeclaration',
	'ClassDeclaration',
	'FunctionExpression',
	'ArrowFunctionExpression',
	'Identifier',
	'Literal',
	'TemplateLiteral',
	'ObjectExpression',
	'ArrayExpression',
]);

/**
Check if an `export default` declaration has side effects.
Safe: declarations, identifiers, literals, objects, arrays, functions.
Unsafe: call expressions, comma expressions, etc.
*/
const isDefaultExportSideEffect = node => !safeDefaultExportTypes.has(node.declaration.type);

/**
Check if an assignment expression is a CJS export (`module.exports`, `exports`).
*/
const isCjsExportAssignment = left => {
	if (left.type !== 'MemberExpression') {
		return false;
	}

	const rootName = getRootIdentifier(left);
	return rootName === 'module' || rootName === 'exports';
};

const safeObjectMethods = new Set([
	'assign',
	'defineProperty',
	'defineProperties',
	'freeze',
	'seal',
]);

/**
Check if a call expression is `Object.<method>(localVar, ...)` targeting a local.
*/
const isLocalObjectMethodCall = (expression, localNames) => {
	const {callee} = expression;
	if (
		callee.type !== 'MemberExpression'
		|| callee.object.type !== 'Identifier'
		|| callee.object.name !== 'Object'
		|| callee.computed
		|| callee.property.type !== 'Identifier'
		|| !safeObjectMethods.has(callee.property.name)
		|| expression.arguments.length === 0
	) {
		return false;
	}

	const rootName = getRootIdentifier(expression.arguments[0]);
	return rootName && localNames.has(rootName);
};

const isSideEffectStatement = (node, localNames) => {
	// Declarations, exports, and imports are always safe
	if (safeStatementTypes.has(node.type)) {
		return false;
	}

	// `export default <expression>` — safe only for declarations and simple values
	if (node.type === 'ExportDefaultDeclaration') {
		return isDefaultExportSideEffect(node);
	}

	// Expression statements need further analysis
	if (node.type === 'ExpressionStatement') {
		const {expression} = node;

		// Allow 'use strict' directives
		if (expression.type === 'Literal' && typeof expression.value === 'string') {
			return false;
		}

		// Assignments — exempt if target is CJS export or locally-declared variable
		if (expression.type === 'AssignmentExpression') {
			if (isCjsExportAssignment(expression.left)) {
				return false;
			}

			const rootName = getRootIdentifier(expression.left);
			if (rootName && localNames.has(rootName)) {
				return false;
			}
		}

		// `Object.assign(localVar, ...)` / `Object.defineProperty(localVar, ...)`
		if (
			expression.type === 'CallExpression'
			&& isLocalObjectMethodCall(expression, localNames)
		) {
			return false;
		}
	}

	// All other top-level statements (if, for, while, throw, try, switch, etc.)
	// are side effects
	return true;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Program', function * (programNode) {
		const {body} = programNode;

		// Files with hashbang are CLI scripts — exempt
		if (context.sourceCode.text.startsWith('#!')) {
			return;
		}

		// Files with no exports are entry points — exempt
		if (!hasExports(body) && !hasCjsExports(body)) {
			return;
		}

		const localNames = getTopLevelLocalNames(body);

		for (const node of body) {
			if (isSideEffectStatement(node, localNames)) {
				yield {
					node,
					messageId: MESSAGE_ID,
				};
			}
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow top-level side effects in module files.',
			recommended: 'unopinionated',
		},
		messages,
	},
};

export default config;
