const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects.',
};

const PURE_COMMENT_REGEX = /^[#@]__(?:PURE|NO_SIDE_EFFECTS)__$/;

function hasPureAnnotation(node, sourceCode) {
	const commentsBefore = sourceCode.getCommentsBefore(node);
	return commentsBefore.some(comment => PURE_COMMENT_REGEX.test(comment.value.trim()));
}

function isAssignment(expression) {
	return expression.type === 'AssignmentExpression';
}

function isDirective(node) {
	return node.type === 'ExpressionStatement'
		&& node.expression.type === 'Literal'
		&& typeof node.expression.value === 'string'
		&& node.directive !== undefined;
}

function isSideEffectingCall(node) {
	if (node.type === 'CallExpression' || node.type === 'NewExpression') {
		return true;
	}

	if (node.type === 'AwaitExpression') {
		return isSideEffectingCall(node.argument);
	}

	return false;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const problems = [];
	let hasExports = false;

	// Check hashbang by examining the first characters of the source text
	const sourceText = sourceCode.getText();
	const hasHashbang = sourceText.startsWith('#!');

	context.on(['ExportDefaultDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'], () => {
		hasExports = true;
	});

	// Flag: export default foo() and export default await foo()
	context.on('ExportDefaultDeclaration', node => {
		const {declaration} = node;
		if (isSideEffectingCall(declaration) && !hasPureAnnotation(declaration, sourceCode)) {
			problems.push({node: declaration, messageId: MESSAGE_ID});
		}
	});

	// Flag: top-level ExpressionStatement that is not an assignment and not a directive
	context.on('ExpressionStatement', node => {
		if (node.parent.type !== 'Program') {
			return;
		}

		if (isDirective(node)) {
			return;
		}

		if (isAssignment(node.expression)) {
			return;
		}

		if (hasPureAnnotation(node, sourceCode)) {
			return;
		}

		problems.push({node, messageId: MESSAGE_ID});
	});

	// Flag: top-level control flow statements (side-effecting by definition)
	context.on([
		'IfStatement',
		'ForStatement',
		'ForInStatement',
		'ForOfStatement',
		'WhileStatement',
		'DoWhileStatement',
		'SwitchStatement',
		'TryStatement',
		'LabeledStatement',
	], node => {
		if (node.parent.type !== 'Program') {
			return;
		}

		problems.push({node, messageId: MESSAGE_ID});
	});

	context.onExit('Program', () => {
		if (hasHashbang || !hasExports) {
			return;
		}

		for (const problem of problems) {
			context.report(problem);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow top-level side effects.',
			recommended: 'unopinionated',
		},
		messages,
	},
};

export default config;
