import {
	typescriptEslintParser,
	vueEslintParser,
} from '../../scripts/parsers.js';

const typescriptParser = {
	name: 'typescript',
	implementation: typescriptEslintParser,
	mergeParserOptions(options) {
		return {
			project: [],
			...options,
		};
	},
};

const vueParser = {
	name: 'vue',
	implementation: vueEslintParser,
};

const parsers = Object.fromEntries([
	typescriptParser,
	vueParser,
].map(parser => [parser.name, parser]));

export default parsers;
