import test from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../../index.js';
import maskJSDocumentSyntax from '../../rules/utils/jsdoc.js';
import {DEFAULT_LANGUAGE_OPTIONS} from '../utils/language-options.js';

const linter = new Linter();

const verifyAndFix = code => linter.verifyAndFix(code, {
	files: ['**'],
	languageOptions: DEFAULT_LANGUAGE_OPTIONS,
	plugins: {unicorn},
	rules: {'unicorn/comment-content': 'error'},
}, {filename: 'file.js'});

test('handles a long whitespace run in a JSDoc comment', t => {
	// `\s*\*?\s*` used to backtrack quadratically over a leading whitespace run that no tag follows, so a 16,000 character run took minutes instead of milliseconds.
	const padding = ' '.repeat(16_000);
	const code = `/**
 * Description.
${padding}x json
 */`;

	const result = verifyAndFix(code);

	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, `/**
 * Description.
${padding}x JSON
 */`);
});

test('a long whitespace run does not make linting slow', t => {
	// Without a budget this test also passes on the quadratic pattern, because the run pays for module loading and JIT, which is noisy enough to hide it. Warm up first, then keep the best of several runs, so a loaded machine cannot hide a regression either.
	const lintWithPadding = size => verifyAndFix(`/**
 * Description.
${' '.repeat(size)}x json
 */`);

	for (const size of [100, 100, 100]) {
		lintWithPadding(size);
	}

	let fastest = Infinity;
	for (let attempt = 0; attempt < 3; attempt++) {
		const start = process.hrtime.bigint();
		lintWithPadding(16_000);
		fastest = Math.min(fastest, Number(process.hrtime.bigint() - start) / 1e6);
	}

	// Measured warm: about 20 ms on the linear pattern, over 6,000 ms on the quadratic one.
	t.assert.strictEqual(fastest < 1000, true, `linting took ${fastest.toFixed(0)}ms`);
});

// Show masked characters as `#`, so the expected strings stay readable
const mask = text => {
	const characters = [...text];
	maskJSDocumentSyntax(characters, text);
	return characters.join('').replaceAll('\u{FFFF}', '#');
};

test('masks quoted values with escaped quotes', t => {
	t.assert.strictEqual(mask(String.raw` * @param {"a\"b"} name description`), ' * ###### ######## #### description');
	t.assert.strictEqual(mask(String.raw` * @param "a \" b" description`), ' * ###### ######## description');
});

test('keeps values that cannot be parsed', t => {
	t.assert.strictEqual(mask(' * @param "unclosed description'), ' * ###### "unclosed description');
	t.assert.strictEqual(mask(' * @param - description'), ' * ###### - description');
	t.assert.strictEqual(mask(' * @param'), ' * ######');
	t.assert.strictEqual(mask(' * @param {unclosed description'), ' * ###### {unclosed description');
	t.assert.strictEqual(mask(' * @param {@link Foo} description'), ' * ###### {#########} description');
	t.assert.strictEqual(mask(' * @template {unclosed T'), ' * ######### {unclosed T');
});

test('masks a comma-separated template name list', t => {
	t.assert.strictEqual(mask(' * @template A, B description'), ' * ######### ## # description');
});

test('masks a quoted inline tag target', t => {
	t.assert.strictEqual(mask(' * {@link "foo bar" text}'), ' * {############### text}');
	t.assert.strictEqual(mask(String.raw` * {@link \} text}`), ' * {#############}');
});

test('masks the name of a name tag but keeps the description', t => {
	t.assert.strictEqual(mask(' * @alias foo.bar description'), ' * ###### ####### description');
	t.assert.strictEqual(mask(' * @fires Foo#change description'), ' * ###### ########## description');
});
