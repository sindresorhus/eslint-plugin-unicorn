import helperValidatorIdentifier from '@babel/helper-validator-identifier';

const {isIdentifierName} = helperValidatorIdentifier;

const MESSAGE_ID = 'prefer-identifier-import-export-specifiers';
const messages = {
	[MESSAGE_ID]: 'Prefer identifier `{{identifier}}` over string literal `{{literal}}`.',
};

const isIdentifierStringLiteral = node =>
	node?.type === 'Literal'
	&& typeof node.value === 'string'
	&& isIdentifierName(node.value);

const isIdentifierToken = token => token.type === 'Identifier' || token.type === 'Keyword';

const shouldCheckLiteral = node => {
	const {parent} = node;

	if (parent.type === 'ImportSpecifier') {
		return parent.imported === node;
	}

	if (parent.type === 'ExportSpecifier') {
		return parent.exported === node
			|| (parent.local === node && parent.exported !== node && Boolean(parent.parent.source));
	}

	return parent.type === 'ExportAllDeclaration' && parent.exported === node;
};

const getReplacement = (node, sourceCode) => {
	let replacement = node.value;

	const [start, end] = sourceCode.getRange(node);
	const tokenBefore = sourceCode.getTokenBefore(node);
	if (tokenBefore && sourceCode.getRange(tokenBefore)[1] === start && isIdentifierToken(tokenBefore)) {
		replacement = ` ${replacement}`;
	}

	const tokenAfter = sourceCode.getTokenAfter(node);
	if (tokenAfter && sourceCode.getRange(tokenAfter)[0] === end && isIdentifierToken(tokenAfter)) {
		replacement += ' ';
	}

	return replacement;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const reportedNodes = new WeakSet();

	context.on('Literal', node => {
		if (!(
			isIdentifierStringLiteral(node)
			&& shouldCheckLiteral(node)
			&& !reportedNodes.has(node)
		)) {
			return;
		}

		reportedNodes.add(node);

		const identifier = node.value;
		return {
			node,
			messageId: MESSAGE_ID,
			data: {
				identifier,
				literal: sourceCode.getText(node),
			},
			fix: fixer => fixer.replaceText(node, getReplacement(node, sourceCode)),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer identifiers over string literals in import and export specifiers.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
