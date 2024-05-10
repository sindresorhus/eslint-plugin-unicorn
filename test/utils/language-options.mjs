import {Legacy} from '@eslint/eslintrc';
import * as espree from 'espree';

const DEFAULT_LANGUAGE_OPTIONS = {
	// When `parser` in `undefined`, `languageOptions` seems has no effect
	parser: espree,
	globals: Object.fromEntries(
		['es2024', 'node', 'browser']
			.flatMap(environment => Object.entries(Legacy.environments.get(environment).globals)),
	),
};

function cleanLanguageOptions(languageOptions) {
	if (!languageOptions.parser) {
		delete languageOptions.parser;
	}

	if (!languageOptions.parserOptions) {
		delete languageOptions.parserOptions;
	}

	return languageOptions;
}

function normalizeLanguageOptions(languageOptions) {
	languageOptions ??= {};

	const {parser, parserOptions} = languageOptions;

	const {
		implementation: parserImplementation,
		mergeParserOptions,
	} = parser ?? {};

	return cleanLanguageOptions({
		...languageOptions,
		parser: parserImplementation ?? parser,
		parserOptions: mergeParserOptions?.(parserOptions) ?? parserOptions,
	});
}

function mergeLanguageOptions(languageOptionsA, languageOptionsB) {
	languageOptionsA ??= {};
	languageOptionsB ??= {};

	return normalizeLanguageOptions({
		...languageOptionsA,
		...languageOptionsB,
		parser: languageOptionsB.parser ?? languageOptionsA.parser,
		globals: {
			...languageOptionsA.globals,
			...languageOptionsB.globals,
		},
		parserOptions: {
			...languageOptionsA.parserOptions,
			...languageOptionsB.parserOptions,
		},
	});
}

export {DEFAULT_LANGUAGE_OPTIONS, normalizeLanguageOptions, mergeLanguageOptions};
