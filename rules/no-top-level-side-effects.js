const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects in modules.',
};

const hasExports = body => body.some(node =>
	node.type === 'ExportNamedDeclaration'
	|| node.type === 'ExportDefaultDeclaration'
	|| node.type === 'ExportAllDeclaration',
);

const hasCjsExports = body => body.some(node => {
	if (node.type !== 'ExpressionStatement') {
		return false;
	}

	const {expression} = node;
	if (expression.type !== 'AssignmentExpression') {
		return false;
	}

	const {left} = expression;

	// `module.exports = ...`
	if (
		left.type === 'MemberExpression'
		&& left.object.type === 'Identifier'
		&& left.object.name === 'module'
		&& !left.computed
		&& left.property.type === 'Identifier'
		&& left.property.name === 'exports'
	) {
		return true;
	}

	// `exports.foo = ...`
	if (
		left.type === 'MemberExpression'
		&& left.object.type === 'Identifier'
		&& left.object.name === 'exports'
	) {
		return true;
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
				if (node.declaration) {
					if (node.declaration.type === 'VariableDeclaration') {
						for (const declarator of node.declaration.declarations) {
							collectBindingNames(declarator.id, names);
						}
					} else if (node.declaration.id) {
						names.add(node.declaration.id.name);
					}
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
	'ExportDefaultDeclaration',
	'ExportAllDeclaration',
	'EmptyStatement',
]);

const isSideEffectStatement = (node, localNames) => {
	// Declarations, exports, and imports are always safe
	if (safeStatementTypes.has(node.type)) {
		return false;
	}

	// Expression statements need further analysis
	if (node.type === 'ExpressionStatement') {
		const {expression} = node;

		// Allow 'use strict' directives
		if (expression.type === 'Literal' && typeof expression.value === 'string') {
			return false;
		}

		// Assignments — exempt if target is a locally-declared variable (not import)
		if (expression.type === 'AssignmentExpression') {
			const {left} = expression;

			// CJS exports: `module.exports = ...`, `exports.foo = ...`
			if (
				left.type === 'MemberExpression'
				&& left.object.type === 'Identifier'
				&& (left.object.name === 'module' || left.object.name === 'exports')
			) {
				return false;
			}

			// Assignments to properties of locally-declared variables: `obj.prop = ...`
			const rootName = getRootIdentifier(left);
			if (rootName && localNames.has(rootName)) {
				return false;
			}
		}

		// `Object.assign(localVar, ...)` / `Object.defineProperty(localVar, ...)`
		if (
			expression.type === 'CallExpression'
			&& expression.callee.type === 'MemberExpression'
			&& expression.callee.object.type === 'Identifier'
			&& expression.callee.object.name === 'Object'
			&& !expression.callee.computed
			&& expression.callee.property.type === 'Identifier'
			&& (
				expression.callee.property.name === 'assign'
				|| expression.callee.property.name === 'defineProperty'
				|| expression.callee.property.name === 'defineProperties'
				|| expression.callee.property.name === 'freeze'
				|| expression.callee.property.name === 'seal'
			)
			&& expression.arguments.length > 0
		) {
			const rootName = getRootIdentifier(expression.arguments[0]);
			if (rootName && localNames.has(rootName)) {
				return false;
			}
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
