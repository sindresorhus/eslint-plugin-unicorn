import {ident, tokenize, tokenTypes} from '@eslint/css-tree';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'no-unknown-css-annotations/error';
const MESSAGE_ID_SUGGESTION = 'no-unknown-css-annotations/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Unknown CSS annotation `!{{annotation}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `!{{annotation}}` with `!important`.',
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', declaration => {
		const {important, property} = declaration;
		if (
			typeof important !== 'string'
			|| ident.decode(important).toLowerCase() === 'important'
			|| ident.decode(property).startsWith('--')
		) {
			return;
		}

		const declarationText = sourceCode.getText(declaration);
		const [declarationStart] = sourceCode.getRange(declaration);
		let annotationStartInDeclaration;
		let identifierStartInDeclaration;
		tokenize(declarationText, (type, start, end) => {
			if (type === tokenTypes.Delim && declarationText[start] === '!') {
				annotationStartInDeclaration = start;
			}

			if (type === tokenTypes.Ident && declarationText.slice(start, end) === important) {
				identifierStartInDeclaration = start;
			}
		});

		const identifierStart = declarationStart + identifierStartInDeclaration;
		const identifierEnd = identifierStart + important.length;
		const annotationStart = declarationStart + annotationStartInDeclaration;

		return {
			node: declaration,
			loc: {
				start: sourceCode.getLocFromIndex(annotationStart),
				end: sourceCode.getLocFromIndex(identifierEnd),
			},
			messageId: MESSAGE_ID_ERROR,
			data: {annotation: important},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {annotation: important},
					/**
					@param {ESLint.Rule.RuleFixer} fixer
					*/
					fix: fixer => fixer.replaceTextRange([identifierStart, identifierEnd], 'important'),
				},
			],
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unknown CSS annotations.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
			'css/css',
		],
	},
};

export default config;
