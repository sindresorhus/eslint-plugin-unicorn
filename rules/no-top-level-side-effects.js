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

	return;
};

/**
Collect names declared at the top level of the program body.
Includes variable declarations, function declarations, class declarations,
and import bindings.
*/
const getTopLevelDeclaredNames = body => {
	const names = new Set();

	for (const node of body) {
		switch (node.type) {
			case 'VariableDeclaration': {
				for (const declarator of node.declarations) {
					if (declarator.id.type === 'Identifier') {
						names.add(declarator.id.name);
					}
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

			case 'ImportDeclaration': {
				for (const specifier of node.specifiers) {
					names.add(specifier.local.name);
				}

				break;
			}

			case 'ExportNamedDeclaration':
			case 'ExportDefaultDeclaration': {
				if (node.declaration) {
					if (node.declaration.type === 'VariableDeclaration') {
						for (const declarator of node.declaration.declarations) {
							if (declarator.id.type === 'Identifier') {
								names.add(declarator.id.name);
							}
						}
					} else if (node.declaration.id) {
						names.add(node.declaration.id.name);
					}
				}

				break;
			}

			// No default
		}
	}

	return names;
};

const isSideEffectStatement = (node, topLevelNames) => {
	// Only expression statements can be side effects
	if (node.type !== 'ExpressionStatement') {
		return false;
	}

	const {expression} = node;

	// Allow 'use strict' directives
	if (expression.type === 'Literal' && typeof expression.value === 'string') {
		return false;
	}

	// Assignments — exempt if target is a module-scoped variable
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
		if (rootName && topLevelNames.has(rootName)) {
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
		if (rootName && topLevelNames.has(rootName)) {
			return false;
		}
	}

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

		const topLevelNames = getTopLevelDeclaredNames(body);

		for (const node of body) {
			if (isSideEffectStatement(node, topLevelNames)) {
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
