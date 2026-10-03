import test from 'node:test';
import {Linter} from 'eslint';
import shouldReportReplaceChildrenReceiver, {mayBeHtmlTemplateElement} from '../../rules/utils/should-report-replace-children-receiver.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

/*
Run `check` on the first argument of each `check()` call in `code`, with type information.
*/
const getResults = (code, check) => {
	const results = [];

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'CallExpression[callee.name="check"]'(node) {
								results.push(check(context, node.arguments[0]));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.ts'});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return results;
};

const shouldReport = (code, options) => getResults(code, (context, node) => shouldReportReplaceChildrenReceiver(context, node, options));

test('a known non-receiver cast to `any` is not reported', t => {
	t.assert.deepStrictEqual(shouldReport('declare const node: Text; check(node as any);'), [false]);
});

test('a type parameter constrained to a non-receiver is not reported', t => {
	t.assert.deepStrictEqual(shouldReport('function f<T extends Text>(node: T) { check(node); }'), [false]);
});

test('an intersection is reported when it has a compatible `replaceChildren()`', t => {
	t.assert.deepStrictEqual(shouldReport('declare const node: Element & {foo: 1}; check(node);', {checkInnerHTML: true}), [true]);
	t.assert.deepStrictEqual(shouldReport('declare const node: {foo: 1} & {bar: 2}; check(node);'), [false]);
});

test('`mayBeHtmlTemplateElement` checks each intersection member and its constraint', t => {
	// The unconstrained `T` makes the intersection unknown to the syntax checker, so only the type check finds the template element
	t.assert.deepStrictEqual(getResults(
		'function f<T, U extends HTMLTemplateElement>(object: {node: T & U}) { check(object.node); }',
		mayBeHtmlTemplateElement,
	), [true]);
	t.assert.deepStrictEqual(getResults(
		'function f<T>(object: {node: T & Text}) { check(object.node); }',
		mayBeHtmlTemplateElement,
	), [false]);
	t.assert.deepStrictEqual(getResults(
		'declare const object: {node: any}; check(object.node);',
		mayBeHtmlTemplateElement,
	), [false]);
});

test('an unconstrained type parameter does not hide a template element', t => {
	// `checker.getNonNullableType(T)` is `T & {}`, which used to recurse forever and fall back to the syntax check
	t.assert.deepStrictEqual(getResults(
		'function f<T>(node: T & HTMLTemplateElement) { check(node); }',
		mayBeHtmlTemplateElement,
	), [true]);
});
