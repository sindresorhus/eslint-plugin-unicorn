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

const getProblem = (node, sourceCode) => {
	if (!isIdentifierStringLiteral(node)) {
		return;
	}

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
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ImportSpecifier', node => getProblem(node.imported, sourceCode));

	context.on('ExportSpecifier', function * (node) {
		yield getProblem(node.exported, sourceCode);

		// In `export {local as exported} from 'foo'`, the local name is also a module export name (only re-exports can write it as a string literal). When not renaming, `local` and `exported` are the same node, so skip to avoid reporting it twice.
		if (node.parent.source && node.local !== node.exported) {
			yield getProblem(node.local, sourceCode);
		}
	});

	context.on('ExportAllDeclaration', node => getProblem(node.exported, sourceCode));

	context.on('ImportAttribute', node => getProblem(node.key, sourceCode));
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
