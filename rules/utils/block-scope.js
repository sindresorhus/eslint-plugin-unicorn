const blockScopedDeclarationTypes = new Set([
	'ClassDeclaration',
	'FunctionDeclaration',
	'TSEnumDeclaration',
	'TSInterfaceDeclaration',
	'TSModuleDeclaration',
	'TSTypeAliasDeclaration',
]);

const isBlockScopedDeclaration = node =>
	(
		node.type === 'VariableDeclaration'
		&& node.kind !== 'var'
	)
	|| blockScopedDeclarationTypes.has(node.type);

/**
Check whether a node is, or directly contains, a block-scoped declaration (`let`/`const`, class, function, or TypeScript type declaration).

@param {object} node
@returns {boolean}
*/
export const hasDirectBlockScopedDeclaration = node =>
	isBlockScopedDeclaration(node)
	|| (
		node.type === 'BlockStatement'
		&& node.body.some(node => isBlockScopedDeclaration(node))
	);

/**
Check whether any token of a node spans more than one line.

@param {object} node
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export const hasMultilineToken = (node, context) => {
	const {sourceCode} = context;
	return sourceCode.getTokens(node).some(token =>
		sourceCode.getLoc(token).start.line !== sourceCode.getLoc(token).end.line,
	);
};
