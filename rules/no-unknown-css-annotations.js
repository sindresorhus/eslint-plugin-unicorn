import {ident, tokenize, tokenTypes} from '@eslint/css-tree';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'no-unknown-css-annotations/error';
const MESSAGE_ID_SUGGESTION = 'no-unknown-css-annotations/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'CSS annotations must use the canonical form `!important`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `!important`.',
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', declaration => {
		const {important, property} = declaration;
		if (
			!important
			|| ident.decode(property).startsWith('--')
		) {
			return;
		}

		const declarationText = sourceCode.getText(declaration);
		const [declarationStart] = sourceCode.getRange(declaration);
		let annotationStartInDeclaration;
		let identifierEndInDeclaration;
		const commentRanges = [];
		tokenize(declarationText, (type, start, end) => {
			if (type === tokenTypes.Delim && declarationText[start] === '!') {
				annotationStartInDeclaration = start;
				identifierEndInDeclaration = undefined;
			}

			// The annotation identifier is the first identifier after the `!`.
			if (
				type === tokenTypes.Ident
				&& annotationStartInDeclaration !== undefined
				&& identifierEndInDeclaration === undefined
			) {
				identifierEndInDeclaration = end;
			}

			if (type === tokenTypes.Comment) {
				commentRanges.push([start, end]);
			}
		});

		if (declarationText.slice(annotationStartInDeclaration, identifierEndInDeclaration) === '!important') {
			return;
		}

		const identifierEnd = declarationStart + identifierEndInDeclaration;
		const annotationStart = declarationStart + annotationStartInDeclaration;
		const hasCommentInAnnotation = commentRanges.some(([start, end]) => start >= annotationStartInDeclaration && end <= identifierEndInDeclaration);

		return {
			node: declaration,
			loc: {
				start: sourceCode.getLocFromIndex(annotationStart),
				end: sourceCode.getLocFromIndex(identifierEnd),
			},
			messageId: MESSAGE_ID_ERROR,
			suggest: hasCommentInAnnotation
				? []
				: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						/**
					@param {ESLint.Rule.RuleFixer} fixer
					*/
						fix: fixer => fixer.replaceTextRange([annotationStart, identifierEnd], '!important'),
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
			description: 'Disallow unknown and noncanonical CSS annotations.',
			recommended: false,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
