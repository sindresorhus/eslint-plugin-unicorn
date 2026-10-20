import test from 'node:test';
import {Linter} from 'eslint';
import replaceReferenceIdentifier from '../../rules/fix/replace-reference-identifier.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

for (const [code, output, selector = 'Identifier[name="ready"]'] of [
	['function run(ready?) { consume(ready); }', 'function run(isReady?) { consume(isReady); }'],
	['class Task { constructor(public ready?) {} }', 'class Task { constructor(public isReady?) {} }'],
	['let ready : boolean; consume(ready);', 'let isReady : boolean; consume(isReady);'],
	['function run(ready ? : boolean) { consume(ready); }', 'function run(isReady ? : boolean) { consume(isReady); }'],
	['class Task {\r\n  constructor(public ready\r\n    : boolean) {}\r\n}', 'class Task {\r\n  constructor(public isReady\r\n    : boolean) {}\r\n}'],
	['function run(ready /* Keep */ ? /* Type */ : boolean) { consume(ready); }', 'function run(isReady /* Keep */ ? /* Type */ : boolean) { consume(isReady); }'],
	[String.raw`function run(r\u0065ady /* Keep */ ?) { consume(r\u0065ady); }`, 'function run(isReady /* Keep */ ?) { consume(isReady); }'],
	['globalThis.ready;', 'isReady;', 'MemberExpression[property.name="ready"]'],
]) {
	test(`replaces a reference without changing surrounding syntax in ${code}`, t => {
		const result = linter.verifyAndFix(code, {
			languageOptions: {
				parser: parsers.typescript.implementation,
				parserOptions: parsers.typescript.mergeParserOptions(),
			},
			plugins: {
				test: {
					rules: {
						rename: {
							meta: {fixable: 'code'},
							create: context => ({
								[selector](node) {
									context.report({
										node,
										message: 'Rename ready.',
										fix: fixer => replaceReferenceIdentifier(node, 'isReady', context, fixer),
									});
								},
							}),
						},
					},
				},
			},
			rules: {'test/rename': 'error'},
		});
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
	});
}
