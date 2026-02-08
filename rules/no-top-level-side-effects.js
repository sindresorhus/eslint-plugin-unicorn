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

const isSideEffectStatement = node => {
	// Expression statements are side effects (bare function calls, assignments to globals, etc.)
	if (node.type === 'ExpressionStatement') {
		const {expression} = node;

		// Allow 'use strict' directives
		if (expression.type === 'Literal' && typeof expression.value === 'string') {
			return false;
		}

		// CJS exports (module.exports = ..., exports.foo = ...) are not side effects
		if (expression.type === 'AssignmentExpression') {
			const {left} = expression;
			if (
				left.type === 'MemberExpression'
				&& left.object.type === 'Identifier'
				&& (left.object.name === 'module' || left.object.name === 'exports')
			) {
				return false;
			}
		}

		return true;
	}

	return false;
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

		for (const node of body) {
			if (isSideEffectStatement(node)) {
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
