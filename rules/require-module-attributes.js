const MESSAGE_ID = 'require-module-attributes';
const messages = {
	[MESSAGE_ID]: '{{type}} with empty attribute list is not allowed.',
};

const isWithToken = token => token?.type === 'Keyword' && token.value === 'with';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on(['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'], declaration => {
		const {source, attributes} = declaration;

		if (!source || (Array.isArray(attributes) && attributes.length > 0)) {
			return;
		}

		const withToken = sourceCode.getTokenAfter(source);

		if (!isWithToken(withToken)) {
			return;
		}

		// `WithStatement` is not possible in modules, so we don't need worry it's not attributes

		const openingBraceToken = sourceCode.getTokenAfter(withToken);
		const closingBraceToken = sourceCode.getTokenAfter(openingBraceToken);

		return {
			node: declaration,
			loc: {
				start: sourceCode.getLoc(openingBraceToken).start,
				end: sourceCode.getLoc(closingBraceToken).end,
			},
			messageId: MESSAGE_ID,
			data: {
				type: declaration.type === 'ImportDeclaration' ? 'import statement' : 'export statement',
			},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => [withToken, closingBraceToken, openingBraceToken].map(token => fixer.remove(token)),
		};
	});

	context.on('ImportExpression', importExpression => {
		const {options: node} = importExpression;

		if (!(node?.type === 'ObjectExpression' && node.properties.length === 0)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {
				type: 'import expression',
			},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => [
				// Comma token before
				sourceCode.getTokenBefore(node),
				// Opening brace token
				sourceCode.getFirstToken(node),
				// Closing brace token
				sourceCode.getLastToken(node),
			].map(token => fixer.remove(token)),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require non-empty attribute list in import and export statements',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
