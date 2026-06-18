import {Linter} from 'eslint';
import test from 'ava';
import hasOptionalChainElement, {hasUnparenthesizedOptionalChainElement} from '../../rules/utils/has-optional-chain-element.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const getVariableInitializer = (code, languageOptions = {}) => getVariableInitializerWithContext(code, languageOptions).initializer;

const getVariableInitializerWithContext = (code, languageOptions = {}) => {
	let initializer;
	let ruleContext;

	linter.verify(code, {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			...languageOptions,
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create(context) {
							ruleContext = context;

							return {
								VariableDeclarator(node) {
									initializer ??= node.init;
								},
							};
						},
					},
				},
			},
		},
		rules: {
			'test/capture': 'error',
		},
	});

	if (!initializer) {
		throw new Error('Expected to find a variable initializer.');
	}

	return {
		context: ruleContext,
		initializer,
	};
};

const typescriptLanguageOptions = {
	parser: parsers.typescript.implementation,
	parserOptions: parsers.typescript.mergeParserOptions(),
};

test('`hasOptionalChainElement` detects optional chain elements', t => {
	for (const code of [
		'const value = object?.array;',
		'const value = object?.array.toSorted();',
		'const value = object?.getArray().toSorted();',
		'const value = object.getArray?.().toSorted();',
	]) {
		t.true(hasOptionalChainElement(getVariableInitializer(code)), 'Expected optional chain to be detected.');
	}
});

test('`hasOptionalChainElement` unwraps TypeScript expression wrappers', t => {
	for (const code of [
		'const value = object?.array!.toSorted();',
		'const value = (object?.array as number[]).toSorted();',
		'const value = (object?.array satisfies number[]).toSorted();',
	]) {
		t.true(hasOptionalChainElement(getVariableInitializer(code, typescriptLanguageOptions)), 'Expected optional chain to be detected through TypeScript wrapper.');
	}
});

test('`hasOptionalChainElement` ignores optional chains outside the chain spine', t => {
	for (const code of [
		'const value = object.array;',
		'const value = object.array.toSorted();',
		'const value = object.getArray().toSorted();',
		'const value = object.method(argument?.property);',
		'const value = object[property?.name].toSorted();',
	]) {
		t.false(hasOptionalChainElement(getVariableInitializer(code)), 'Expected non-optional chain to be ignored.');
	}
});

test('`hasUnparenthesizedOptionalChainElement` detects unparenthesized optional chains', t => {
	for (const code of [
		'const value = object?.array.slice();',
		'const value = object?.array!.slice();',
	]) {
		const {initializer, context} = getVariableInitializerWithContext(code, typescriptLanguageOptions);

		t.true(hasUnparenthesizedOptionalChainElement(initializer, context), 'Expected unparenthesized optional chain to be detected.');
	}
});

test('`hasUnparenthesizedOptionalChainElement` ignores parenthesized optional chains', t => {
	for (const code of [
		'const value = (object?.array).slice();',
		'const value = (object?.array as number[]).slice();',
		'const value = (object?.array satisfies number[]).slice();',
		'const value = (object?.array!).slice();',
	]) {
		const {initializer, context} = getVariableInitializerWithContext(code, typescriptLanguageOptions);

		t.false(hasUnparenthesizedOptionalChainElement(initializer, context), 'Expected parenthesized optional chain to be ignored.');
	}
});
