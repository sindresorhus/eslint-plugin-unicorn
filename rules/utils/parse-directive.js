import {ConfigCommentParser} from '@eslint/plugin-kit';

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
