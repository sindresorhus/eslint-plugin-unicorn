import {Linter} from 'eslint';
import test from 'ava';
import {
	getStaticRegExp,
	getStaticValueIfNoSideEffects,
} from '../../rules/utils/index.js';

const linter = new Linter();

const evaluate = (code, getValue) => {
	let value;

	linter.verify(code, {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							VariableDeclarator(node) {
								if (node.id.type === 'Identifier' && node.id.name === 'result') {
									value = getValue(node.init, context);
								}
							},
						}),
					},
				},
			},
		},
		rules: {
			'test/capture': 'error',
		},
	});

	return value;
};

const getStaticValue = (node, context) => getStaticValueIfNoSideEffects(node, context);

test('returns unknown for mutated collection sizes and getter-backed members', t => {
	for (const code of [
		'const set = new Set(); set.add(\'value\'); const result = set.size;',
		'const map = new Map(); map.set(\'key\', \'value\'); const result = map.size;',
		'const object = {value: true}; Object.defineProperty(object, \'value\', {get() { return false; }}); const result = object.value;',
	]) {
		t.is(evaluate(code, getStaticValue), undefined);
	}
});

test('preserves safe static primitives and pass-through calls', t => {
	t.true(evaluate('const result = true;', getStaticValue)?.value);
	t.false(evaluate('const result = false;', getStaticValue)?.value);

	for (const method of ['freeze', 'seal', 'preventExtensions']) {
		const result = evaluate(`const result = Object.${method}({value: true});`, getStaticValue);
		t.true(result?.value.value);
	}
});

test('does not recurse forever through cyclic constant aliases', t => {
	const result = evaluate(
		'const first = Object.freeze(second); const second = Object.freeze(first); const result = first;',
		getStaticValue,
	);
	t.is(result, undefined);
});

test('does not treat a RegExp constructed from a Symbol as static', t => {
	const result = evaluate(
		'const regex = new RegExp(Symbol()); const result = regex;',
		getStaticRegExp,
	);
	t.is(result, undefined);
});
