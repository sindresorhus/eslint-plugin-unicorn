import {Linter} from 'eslint';
import test from 'ava';
import outdent from 'outdent';
import plugin from '../../index.js';
import {isIteratorExpression} from '../../rules/shared/iterator-helpers.js';

const linter = new Linter();

for (const [expected, cases] of [
	[true, [
		'const iterator = items.values(); inspect(iterator);',
		'const iterator = items.values(); const alias = iterator; inspect(alias);',
		'const iterator = items.values().map(callback); const filtered = iterator.filter(predicate); inspect(filtered);',
		'const iterator = Iterator.from(items); inspect(iterator);',
		'function * generate() { yield 1; } inspect(generate());',
		'function * generate() { yield 1; } const iterator = generate(); inspect(iterator);',
		'const generate = function * () { yield 1; }; inspect(generate());',
		'function * generate() { yield 1; } const alias = generate; const otherAlias = alias; inspect(otherAlias());',
		'inspect((function * () { yield 1; })());',
	]],
	[false, [
		'let iterator = items.values(); inspect(iterator);',
		'var iterator = items.values(); inspect(iterator);',
		'const {iterator} = items.values(); inspect(iterator);',
		'const [iterator] = [items.values()]; inspect(iterator);',
		'const iterator = items.values(); iterator = []; inspect(iterator);',
		'const iterator = iterator; inspect(iterator);',
		'const first = second; const second = first; inspect(first);',
		'const iterator = iterator.map(callback); inspect(iterator);',
		'const first = second.map(callback); const second = first.filter(predicate); inspect(first);',
		'const generate = generate; inspect(generate());',
		'const first = second; const second = first; inspect(first());',
		'function * generate() { yield 1; } generate = other; inspect(generate());',
		'let generate = function * () { yield 1; }; inspect(generate());',
		'function * generate() { yield 1; } function run(generate) { inspect(generate()); }',
		'async function * generate() { yield 1; } inspect(generate());',
		'const generate = async function * () { yield 1; }; inspect(generate());',
		'function generate() { return items.values(); } inspect(generate());',
		'import generate from "generator"; inspect(generate());',
		'const object = { * generate() { yield 1; } }; inspect(object.generate());',
		'const {generate} = { * generate() { yield 1; } }; inspect(generate());',
		'function * generate() { yield 1; } inspect(generate?.());',
		'const array = []; inspect(array);',
	]],
]) {
	for (const code of cases) {
		test(`${expected}: ${code}`, t => {
			const results = [];
			const messages = linter.verify(code, {
				languageOptions: {globals: {Iterator: 'readonly'}},
				plugins: {
					test: {
						rules: {
							inspect: {
								create: context => ({
									CallExpression(node) {
										if (node.callee.name === 'inspect') {
											results.push(isIteratorExpression(node.arguments[0], context));
										}
									},
								}),
							},
						},
					},
				},
				rules: {'test/inspect': 'error'},
			});
			t.deepEqual(messages, []);
			t.deepEqual(results, [expected]);
		});
	}
}

test('builtin and iterator rules report each discarded call once', t => {
	const code = outdent`
		items.values().map(transform);
		const iterator = items.values();
		iterator.filter(predicate);
		items.map(transform);
		function * generate() {
			yield 1;
		}
		generate().map(transform);
		items.values().filter(predicate).map(transform);
	`;
	const messages = linter.verify(code, {
		plugins: {unicorn: plugin},
		rules: {
			'unicorn/no-unused-builtin-method-return': 'error',
			'unicorn/no-unused-iterator-helper': 'error',
		},
	});
	t.deepEqual(messages.map(({ruleId}) => ruleId), [
		'unicorn/no-unused-iterator-helper',
		'unicorn/no-unused-iterator-helper',
		'unicorn/no-unused-builtin-method-return',
		'unicorn/no-unused-iterator-helper',
		'unicorn/no-unused-iterator-helper',
	]);
});
