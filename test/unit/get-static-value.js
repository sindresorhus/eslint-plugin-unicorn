import {Linter} from 'eslint';
import test from 'ava';
import {getStaticValueIfNoSideEffects} from '../../rules/utils/index.js';

const linter = new Linter();

const evaluate = (code, getValue) => {
	let hasCapturedValue = false;
	let value;

	const messages = linter.verify(code, {
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
								if (node.id.type !== 'Identifier' || node.id.name !== 'result') {
									return;
								}

								hasCapturedValue = true;
								value = getValue(node.init, context);
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
	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	if (!hasCapturedValue) {
		throw new Error('The test rule did not capture a result variable.');
	}

	return value;
};

test('returns unknown for mutated collection sizes and getter-backed members', t => {
	for (const code of [
		'const set = new Set(); set.add(\'value\'); const result = set.size;',
		'const map = new Map(); map.set(\'key\', \'value\'); const result = map.size;',
		'const object = {value: true}; Object.defineProperty(object, \'value\', {get() { return false; }}); const result = object.value;',
	]) {
		t.is(evaluate(code, getStaticValueIfNoSideEffects), undefined);
	}
});

test('preserves safe static primitives and pass-through calls', t => {
	t.true(evaluate('const result = true;', getStaticValueIfNoSideEffects)?.value);
	t.false(evaluate('const result = false;', getStaticValueIfNoSideEffects)?.value);

	for (const method of ['freeze', 'seal', 'preventExtensions']) {
		const result = evaluate(`const result = Object.${method}({value: true});`, getStaticValueIfNoSideEffects);
		t.true(result?.value.value);
	}
});

test('does not recurse forever through cyclic constant aliases', t => {
	const result = evaluate(
		'const first = Object.freeze(second); const second = Object.freeze(first); const result = first;',
		getStaticValueIfNoSideEffects,
	);
	t.is(result, undefined);
});
