import {Linter} from 'eslint';
import test from 'ava';
import {
	getStaticRegExp,
	getStaticValueForControlFlow,
	getStaticValueIfNoSideEffects,
	hasPotentiallyMutableBinding,
	hasPotentiallyMutableMemberAccess,
} from '../../rules/utils/index.js';

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

test('detects potentially mutable member accesses', t => {
	for (const [code, expected] of [
		['const object = {value: true}; const result = object.value;', true],
		['const result = ({value: true}).value;', false],
		['const text = \'value\'; const result = text.length;', false],
		['const values = [\'value\']; const result = values[0];', true],
	]) {
		t.is(evaluate(code, hasPotentiallyMutableMemberAccess), expected);
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

test('detects potentially mutable variable bindings', t => {
	for (const code of [
		'let value = true; value = false; const result = value;',
		'var value = true; value = false; const result = value;',
		'let value = true; const alias = value; const result = alias;',
		'const alias = value; let value = true; const result = alias;',
	]) {
		t.true(evaluate(code, hasPotentiallyMutableBinding));
	}

	t.false(evaluate('const value = true; const result = value;', hasPotentiallyMutableBinding));
});

test('does not use mutable bindings for control-flow decisions', t => {
	for (const code of [
		'const alias = value; let value = true; const result = alias;',
		'const alias = value; var value = true; const result = alias;',
	]) {
		t.is(evaluate(code, getStaticValueForControlFlow), undefined);
	}

	t.true(evaluate('const value = true; const result = value;', getStaticValueForControlFlow)?.value);
});

test('preserves known static global properties', t => {
	for (const [code, expected] of [
		['const result = Math.PI;', Math.PI],
		['const result = Math[\'PI\'];', Math.PI],
		['const result = Number.MAX_SAFE_INTEGER;', Number.MAX_SAFE_INTEGER],
		['const result = Number[\'MAX_SAFE_INTEGER\'];', Number.MAX_SAFE_INTEGER],
		['const result = Symbol.iterator;', Symbol.iterator],
		['const result = Symbol[\'iterator\'];', Symbol.iterator],
		['const result = String.raw`foo`;', 'foo'],
	]) {
		t.is(evaluate(code, getStaticValueIfNoSideEffects)?.value, expected);
	}
});

test('returns static regular expressions only for safe expressions', t => {
	for (const code of [
		'const result = /foo/g;',
		'const result = new RegExp(\'foo\', \'g\');',
		'const expression = new RegExp(\'foo\'); const result = expression;',
	]) {
		const result = evaluate(code, getStaticRegExp);
		t.true(result instanceof RegExp);
		t.is(result.source, 'foo');
	}

	t.is(evaluate('const result = new RegExp(getPattern());', getStaticRegExp), undefined);
});

test('does not recurse forever through cyclic constant aliases', t => {
	const result = evaluate(
		'const first = Object.freeze(second); const second = Object.freeze(first); const result = first;',
		getStaticValueIfNoSideEffects,
	);
	t.is(result, undefined);
});
