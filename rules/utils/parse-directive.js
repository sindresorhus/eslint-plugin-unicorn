import {ConfigCommentParser} from '@eslint/plugin-kit';

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
@returns {{
	label: string,
	value: string,
	justification: string,
	isEslintDisableDirective: boolean,
	isEslintEnableDirective: boolean,
}|undefined}
*/
export default function parseDirective(comment) {
	configCommentParser ??= new ConfigCommentParser();

	const result = configCommentParser.parseDirective(comment.value);

	if (!result) {
		return;
	}

	const {label} = result;
	const isEslintDisableDirective = ESLINT_DISABLE_DIRECTIVES.has(label);
	const isEslintEnableDirective = label === 'eslint-enable';

	return {
		...result,
		isEslintDisableDirective,
		isEslintEnableDirective,
	};
}
