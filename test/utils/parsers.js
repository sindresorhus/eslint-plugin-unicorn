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
		// Tests lint multiple snippets with the same virtual filename, so the parser's CI single-run cache is unsafe.
		disallowAutomaticSingleRunInference: true,
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
