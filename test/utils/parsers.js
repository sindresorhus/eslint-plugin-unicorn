import {
	htmlEslintParser,
	svelteEslintParser,
	typescriptEslintParser,
	vueEslintParser,
} from '../../scripts/parsers.js';

const typescriptParser = {
	name: 'typescript',
	implementation: typescriptEslintParser,
	mergeParserOptions: options => ({
		project: [],
		...options,
	}),
};

const vueParser = {
	name: 'vue',
	implementation: vueEslintParser,
};

const htmlParser = {
	name: 'html',
	implementation: htmlEslintParser,
};

const svelteParser = {
	name: 'svelte',
	implementation: svelteEslintParser,
};

const parsers = Object.fromEntries([
	htmlParser,
	typescriptParser,
	vueParser,
	svelteParser,
].map(parser => [parser.name, parser]));

export default parsers;
