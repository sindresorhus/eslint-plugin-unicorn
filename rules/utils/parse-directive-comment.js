import {ConfigCommentParser} from '@eslint/plugin-kit';

/**
@typedef {Exclude<ReturnType<ConfigCommentParser['parseDirective']>, undefined>} DirectiveComment
*/

// https://github.com/eslint/eslint/blob/ecd0ede7fd2ccbb4c0daf0e4732e97ea0f49db1b/lib/linter/linter.js#L509-L512
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
