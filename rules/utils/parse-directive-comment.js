import {ConfigCommentParser} from '@eslint/plugin-kit';

/**
@typedef {Exclude<ReturnType<ConfigCommentParser['parseDirective']>, undefined>} DirectiveComment
*/

// https://github.com/eslint/eslint/blob/df5566f826d9f5740546e473aa6876b1f7d2f12c/lib/languages/js/source-code/source-code.js#L914-L917
const ESLINT_DISABLE_DIRECTIVES = new Set([
	'eslint-disable',
	'eslint-disable-line',
	'eslint-disable-next-line',
]);

let configCommentParser;

/**
Parse a directive comment value and return directive meta info.

@param {ESTree.Comment} comment
@returns {
	| DirectiveComment & {
			isEslintDisableDirective: boolean,
			isEslintEnableDirective: boolean,
		}
	| undefined
}
*/
export default function parseDirectiveComment(comment) {
	configCommentParser ??= new ConfigCommentParser();

	const result = configCommentParser.parseDirective(comment.value);

	if (!result) {
		return;
	}

	const {label} = result;

	return {
		...result,
		isEslintDisableDirective: ESLINT_DISABLE_DIRECTIVES.has(label),
		isEslintEnableDirective: label === 'eslint-enable',
	};
}
