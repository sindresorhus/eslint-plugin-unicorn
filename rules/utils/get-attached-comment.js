const isComment = token => token?.type === 'Block' || token?.type === 'Line';

const commentAttachmentParentTypes = new Set([
	'AssignmentExpression',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration',
	'ExpressionStatement',
	'MethodDefinition',
	'Property',
	'PropertyDefinition',
	'TSAbstractMethodDefinition',
	'TSAbstractPropertyDefinition',
	'TSPropertySignature',
	'TSTypeAliasDeclaration',
	'TSTypeAnnotation',
	'VariableDeclaration',
	'VariableDeclarator',
]);

/**
Get the adjacent comment attached to a node or its enclosing declaration.

@param {object} node
@param {import('eslint').Rule.RuleContext} context
@returns {object | undefined}
*/
const getAttachedComment = (node, context) => {
	const {sourceCode} = context;
	let previousToken = sourceCode.getTokenBefore(node, {includeComments: true});
	let commentableNode = node;

	while (
		!isComment(previousToken)
		&& commentAttachmentParentTypes.has(commentableNode.parent?.type)
	) {
		commentableNode = commentableNode.parent;
		previousToken = sourceCode.getTokenBefore(commentableNode, {includeComments: true});
	}

	if (!isComment(previousToken)) {
		return;
	}

	const commentEnd = sourceCode.getLoc(previousToken).end;
	const nodeStart = sourceCode.getLoc(commentableNode).start;

	if (commentEnd.line < nodeStart.line - 1) {
		return;
	}

	return previousToken;
};

export default getAttachedComment;
