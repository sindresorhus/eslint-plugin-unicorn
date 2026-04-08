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

	if (left.type !== 'MemberExpression') {
		return false;
	}

	const rootName = getRootIdentifier(left);

	// `exports.foo = ...`
	if (rootName === 'exports') {
		return true;
	}

	// `module.exports = ...` or `module.exports.foo = ...`
	// Must specifically be `module.exports`, not other `module.*` properties
	if (rootName === 'module') {
		let current = left;
		while (current.type === 'MemberExpression' && current.object.type === 'MemberExpression') {
			current = current.object;
		}

		return (
			current.type === 'MemberExpression'
			&& current.object.type === 'Identifier'
			&& current.object.name === 'module'
			&& !current.computed
			&& current.property.type === 'Identifier'
			&& current.property.name === 'exports'
		);
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
]);

/**
Check if an expression contains no side effects (no calls, new, tagged templates).
Recursively checks object/array literals.
*/
const isPureExpression = node => {
	switch (node.type) {
		case 'Identifier':
		case 'Literal':
		case 'FunctionExpression':
		case 'ArrowFunctionExpression': {
			return true;
		}

		case 'TemplateLiteral': {
			// Template literals are pure only if all embedded expressions are pure
			return node.expressions.every(expression => isPureExpression(expression));
		}

		case 'ObjectExpression': {
			return node.properties.every(property =>
				property.type === 'SpreadElement'
					? isPureExpression(property.argument)
					: isPureExpression(property.value) && (!property.computed || isPureExpression(property.key)),
			);
		}

		case 'ArrayExpression': {
			return node.elements.every(element => {
				if (!element) {
					return true;
				}

				return element.type === 'SpreadElement'
					? isPureExpression(element.argument)
					: isPureExpression(element);
			});
		}

		case 'MemberExpression': {
			// Computed member access like `object[setup()]` must check the property expression
			if (node.computed && !isPureExpression(node.property)) {
				return false;
			}

			return isPureExpression(node.object);
		}

		default: {
			return false;
		}
	}
};

/**
Check if a node has a pure/no-side-effects leading comment annotation.
Supports `@__PURE__`, `#__PURE__`, `@__NO_SIDE_EFFECTS__`, and `#__NO_SIDE_EFFECTS__`.
@see https://github.com/javascript-compiler-hints/compiler-notations-spec
*/
const hasPureAnnotation = (node, sourceCode) => {
	const comments = sourceCode.getCommentsBefore(node);
	return comments.some(comment =>
		comment.type === 'Block' && /[#@]__(?:PURE|NO_SIDE_EFFECTS)__/.test(comment.value),
	);
};

/**
Check if an `export default` declaration has side effects.
Safe: function/class declarations, function expressions, identifiers, literals.
Unsafe: call expressions, new expressions, tagged templates, object/array literals
(which can contain call expressions in values), comma expressions, etc.
Pure-annotated call expressions (`@__PURE__` / `#__PURE__` / `@__NO_SIDE_EFFECTS__` / `#__NO_SIDE_EFFECTS__`) are also safe.
*/
const isDefaultExportSideEffect = (node, sourceCode, noSideEffectsFunctions) => {
	const {declaration} = node;

	if (safeDefaultExportTypes.has(declaration.type)) {
		return false;
	}

	if (isPureExpression(declaration)) {
		return false;
	}

	if (hasPureAnnotation(declaration, sourceCode)) {
		return false;
	}

	if (isNoSideEffectsCall(declaration, noSideEffectsFunctions)) {
		return false;
	}

	return true;
};

/**
Check if an assignment expression is a CJS export (`module.exports`, `exports`).
Only matches `module.exports` and `exports`, not other `module.*` properties like `module.id`.
*/
const isCjsExportAssignment = left => {
	if (left.type !== 'MemberExpression') {
		return false;
	}

	// `exports.foo = ...` or `exports = ...`
	const rootName = getRootIdentifier(left);
	if (rootName === 'exports') {
		return true;
	}

	// `module.exports = ...` or `module.exports.foo = ...`
	// Must be rooted at `module` with `exports` as the first property
	if (rootName === 'module') {
		// Walk up to find the `module.exports` part
		let current = left;
		while (current.type === 'MemberExpression' && current.object.type === 'MemberExpression') {
			current = current.object;
		}

		// `current` is now the innermost MemberExpression: `module.exports`
		return (
			current.type === 'MemberExpression'
			&& current.object.type === 'Identifier'
			&& current.object.name === 'module'
			&& !current.computed
			&& current.property.type === 'Identifier'
			&& current.property.name === 'exports'
		);
	}

	return false;
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

const isSideEffectStatement = (node, localNames, sourceCode, noSideEffectsFunctions) => {
	// Declarations, exports, and imports are always safe
	if (safeStatementTypes.has(node.type)) {
		return false;
	}

	// `export default <expression>` — safe only for declarations and simple values
	if (node.type === 'ExportDefaultDeclaration') {
		return isDefaultExportSideEffect(node, sourceCode, noSideEffectsFunctions);
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

		// Pure-annotated call expressions are safe
		if (
			expression.type === 'CallExpression'
			&& hasPureAnnotation(expression, sourceCode)
		) {
			return false;
		}

		// Calls to functions annotated with `#__NO_SIDE_EFFECTS__` are safe
		if (isNoSideEffectsCall(expression, noSideEffectsFunctions)) {
			return false;
		}
	}

	// All other top-level statements (if, for, while, throw, try, switch, etc.)
	// are side effects
	return true;
};

/**
Collect names of functions annotated with `#__NO_SIDE_EFFECTS__` or `@__NO_SIDE_EFFECTS__`.
Calls to these functions are treated as pure (no side effects).
*/
const getNoSideEffectsFunctionNames = (body, sourceCode) => {
	const names = new Set();

	for (const node of body) {
		const declaration = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration'
			? node.declaration
			: node;

		if (
			declaration?.type === 'FunctionDeclaration'
			&& declaration.id
			&& hasPureAnnotation(declaration, sourceCode)
		) {
			names.add(declaration.id.name);
		}
	}

	return names;
};

/**
Check if a call expression calls a function annotated with `#__NO_SIDE_EFFECTS__`.
*/
const isNoSideEffectsCall = (expression, noSideEffectsFunctions) => {
	if (expression.type !== 'CallExpression') {
		return false;
	}

	const {callee} = expression;
	return callee.type === 'Identifier' && noSideEffectsFunctions.has(callee.name);
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
		const {sourceCode} = context;
		const noSideEffectsFunctions = getNoSideEffectsFunctionNames(body, sourceCode);

		for (const node of body) {
			if (isSideEffectStatement(node, localNames, sourceCode, noSideEffectsFunctions)) {
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
