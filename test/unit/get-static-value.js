import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {Linter} from 'eslint';
import {
	getStaticRegExp,
	getStaticValueForControlFlow,
	getStaticValueIfNoSideEffects,
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
		t.assert.strictEqual(evaluate(code, getStaticValueIfNoSideEffects), undefined);
	}
});

test('detects potentially mutable member accesses', t => {
	for (const [code, expected] of [
		['const object = {value: true}; const result = object.value;', true],
		['const result = ({value: true}).value;', false],
		['const text = \'value\'; const result = text.length;', false],
		['const values = [\'value\']; const result = values[0];', true],
	]) {
		t.assert.strictEqual(evaluate(code, hasPotentiallyMutableMemberAccess), expected);
	}
});

test('preserves safe static primitives and pass-through calls', t => {
	t.assert.strictEqual(evaluate('const result = true;', getStaticValueIfNoSideEffects)?.value, true);
	t.assert.strictEqual(evaluate('const result = false;', getStaticValueIfNoSideEffects)?.value, false);

	for (const method of ['freeze', 'seal', 'preventExtensions']) {
		const result = evaluate(`const result = Object.${method}({value: true});`, getStaticValueIfNoSideEffects);
		t.assert.strictEqual(result?.value.value, true);
	}
});

test('does not use mutable bindings for control-flow decisions', t => {
	for (const code of [
		'const alias = value; let value = true; const result = alias;',
		'const alias = value; var value = true; const result = alias;',
		'let value = true; const alias = value; value = false; const result = alias;',
	]) {
		t.assert.strictEqual(evaluate(code, getStaticValueForControlFlow), undefined);
	}

	t.assert.strictEqual(evaluate('const value = true; const result = value;', getStaticValueForControlFlow)?.value, true);
});

test('does not use constants referenced before their declarations complete for control-flow decisions', t => {
	for (const code of [
		'const result = value; const value = true;',
		'const alias = value; const value = true; const result = alias;',
	]) {
		t.assert.strictEqual(evaluate(code, getStaticValueForControlFlow), undefined);
	}
});

test('ignores unsafe bindings in statically unreachable branches', t => {
	for (const [code, expected] of [
		['const condition = true; let value; const result = condition ? {} : value;', {}],
		['const condition = false; let value; const result = condition ? value : {};', {}],
		['const condition = true; let value; const result = condition || value;', true],
		['const condition = false; let value; const result = condition && value;', false],
		['const result = true ? 1 : value; const value = 2;', 1],
	]) {
		t.assert.deepStrictEqual(evaluate(code, getStaticValueForControlFlow)?.value, expected);
	}
});

test('rejects mutable bindings on evaluated short-circuit paths', t => {
	for (const code of [
		'const condition = true; let value; const result = condition && value;',
		'const condition = false; let value; const result = condition || value;',
		'const condition = null; let value; const result = condition ?? value;',
	]) {
		t.assert.strictEqual(evaluate(code, getStaticValueForControlFlow), undefined);
	}
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
		t.assert.strictEqual(evaluate(code, getStaticValueIfNoSideEffects)?.value, expected);
	}
});

test('preserves static template member names and string receivers', t => {
	for (const [code, expected] of [
		['const result = Math[`P\\u0049`];', Math.PI],
		['const result = Number[`MAX_SAFE_INTEGER`];', Number.MAX_SAFE_INTEGER],
		['const result = Symbol[`iterator`];', Symbol.iterator],
		['const result = `abc`.length;', 3],
		['const text = `ab\\u0063`; const result = text[1];', 'b'],
		['const result = ``.length;', 0],
	]) {
		t.assert.strictEqual(evaluate(code, getStaticValueIfNoSideEffects)?.value, expected, code);
	}
});

test('returns static regular expressions only for safe expressions', t => {
	for (const code of [
		'const result = /foo/g;',
		'const result = new RegExp(\'foo\', \'g\');',
		'const expression = new RegExp(\'foo\'); const result = expression;',
	]) {
		const result = evaluate(code, getStaticRegExp);
		t.assert.strictEqual(result instanceof RegExp, true);
		t.assert.strictEqual(result.source, 'foo');
	}

	t.assert.strictEqual(evaluate('const result = new RegExp(getPattern());', getStaticRegExp), undefined);
});

test('returns static regular expressions from ordinary constructor calls', t => {
	for (const [code, source, flags] of [
		['const result = RegExp(\'foo\', \'i\');', 'foo', 'i'],
		['const result = RegExp(/foo/g);', 'foo', 'g'],
		['const result = RegExp(/foo/g, \'i\');', 'foo', 'i'],
		['const result = RegExp(/foo/g, undefined);', 'foo', 'g'],
		['const result = RegExp();', '(?:)', ''],
		['const flags = \'iy\'; const result = RegExp(`foo`, flags);', 'foo', 'iy'],
		['const expression = RegExp(\'foo\', \'i\'); const result = expression;', 'foo', 'i'],
		['const expression = Object.freeze(/foo/); const result = RegExp(expression);', 'foo', ''],
	]) {
		const result = evaluate(code, getStaticRegExp);
		t.assert.strictEqual(result instanceof RegExp, true, code);
		t.assert.strictEqual(result.source, source, code);
		t.assert.strictEqual(result.flags, flags, code);
	}
});

test('rejects unresolved or unsafe regular expression constructor calls', t => {
	for (const code of [
		'const result = RegExp(pattern);',
		'const result = RegExp(pattern, \'i\');',
		'const result = RegExp(\'foo\', flags);',
		'const result = RegExp(getPattern());',
		'const result = RegExp(\'foo\', getFlags());',
		'const result = RegExp(\'foo\'.trim());',
		'const regexp = /foo/; const result = RegExp(Object.freeze(regexp));',
		'const regexp = /foo/; const result = new RegExp(Object.freeze(regexp));',
		'const result = RegExp(\'[\');',
		'const result = RegExp(\'foo\', \'ii\');',
		'const result = RegExp(...[\'foo\']);',
		'const result = RegExp?.(\'foo\');',
		'const expression = RegExp(pattern); const result = expression;',
		'let expression = RegExp(\'foo\', \'i\'); const result = expression;',
		'let expression = RegExp(\'foo\'); expression = /bar/g; const result = expression;',
	]) {
		t.assert.strictEqual(evaluate(code, getStaticRegExp), undefined, code);
	}

	t.assert.strictEqual(evaluate('const result = RegExp?.(\'foo\');', (node, context) => getStaticRegExp(node.expression, context)), undefined);
});

test('regular expression inference rejects mutable and uninitialized bindings', t => {
	for (const code of [
		'const result = regexp; var regexp = /foo/;',
		'var regexp = /foo/; const result = regexp;',
		'let regexp = /foo/; const result = regexp;',
		'const alias = regexp; var regexp = /foo/; const result = alias;',
		'const result = new RegExp(/foo/g, flags); var flags = \'i\';',
		'let flags = \'i\'; const result = RegExp(/foo/g, flags);',
		'let pattern = \'foo\'; const result = RegExp(pattern, \'i\');',
		'var flags = \'i\'; const alias = flags; const result = new RegExp(/foo/g, alias);',
	]) {
		t.assert.strictEqual(evaluate(code, getStaticRegExp), undefined, code);
	}
});

test('regular expression inference preserves initialized constant alias chains', t => {
	for (const [code, flags] of [
		['const regexp = /foo/g; const alias = regexp; const result = alias;', 'g'],
		['const flags = \'i\'; const alias = flags; const result = RegExp(\'foo\', alias);', 'i'],
	]) {
		const result = evaluate(code, getStaticRegExp);
		t.assert.strictEqual(result?.source, 'foo', code);
		t.assert.strictEqual(result.flags, flags, code);
	}
});

test('does not recurse forever through cyclic constant aliases', t => {
	for (const code of [
		'const value = value; const result = value;',
		'const first = second; const second = first; const result = first;',
		'const first = {value: second}; const second = {value: first}; const result = first;',
		'const first = Object.freeze(second); const second = Object.freeze(first); const result = first;',
	]) {
		t.assert.strictEqual(evaluate(code, getStaticValueIfNoSideEffects), undefined, code);
		t.assert.strictEqual(evaluate(code, getStaticValueForControlFlow), undefined, code);
		t.assert.strictEqual(evaluate(code, hasPotentiallyMutableMemberAccess), true, code);
	}

	for (const [code, expected] of [
		['const value = true; const alias = value; const result = [alias, alias];', [true, true]],
		['const value = true; const alias = Object.freeze(value); const result = Object.freeze([alias, alias]);', [true, true]],
	]) {
		t.assert.deepStrictEqual(evaluate(code, getStaticValueIfNoSideEffects)?.value, expected, code);
		t.assert.deepStrictEqual(evaluate(code, getStaticValueForControlFlow)?.value, expected, code);
		t.assert.strictEqual(evaluate(code, hasPotentiallyMutableMemberAccess), false, code);
	}
});

test('rejects side-effectful calls before static evaluation', t => {
	const moduleUrl = new URL('../../rules/utils/get-static-value.js', import.meta.url);
	const script = [
		'const originalPadEnd = String.prototype.padEnd;',
		'let wasExpensivePadEndCalled = false;',
		'String.prototype.padEnd = function (targetLength, fillString) {',
		'\tif (targetLength === 100_000_000) {',
		'\t\twasExpensivePadEndCalled = true;',
		'\t\treturn this;',
		'\t}',
		'\treturn Reflect.apply(originalPadEnd, this, [targetLength, fillString]);',
		'};',
		'const {Linter} = await import(\'eslint\');',
		`const {default: getStaticValueIfNoSideEffects} = await import(${JSON.stringify(moduleUrl.href)});`,
		'const linter = new Linter();',
		'linter.verify("const directResult = \'\'.padEnd(100_000_000).normalize(); const expensive = \'\'.padEnd(100_000_000).normalize(); const aliasResult = expensive;", {',
		'\tlanguageOptions: {ecmaVersion: \'latest\'},',
		'\tplugins: {test: {rules: {capture: {create: context => ({',
		'\t\tVariableDeclarator(node) {',
		'\t\t\tif (node.id.name === \'directResult\' || node.id.name === \'aliasResult\') {',
		'\t\t\t\tgetStaticValueIfNoSideEffects(node.init, context);',
		'\t\t\t}',
		'\t\t},',
		'\t})}}}},',
		'\trules: {\'test/capture\': \'error\'},',
		'});',
		'if (wasExpensivePadEndCalled) {',
		'\tthrow new Error(\'Static evaluation called String#padEnd.\');',
		'}',
	].join('\n');
	const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {encoding: 'utf8'});

	t.assert.strictEqual(result.status, 0, `Child process failed: ${result.error?.message ?? result.stderr}`);
});

test('returns `undefined` for regular expressions that cannot be created statically', t => {
	for (const code of [
		'const result = new RegExp(...[\'foo\']);',
		'const result = new RegExp(\'[\');',
	]) {
		t.assert.strictEqual(evaluate(code, getStaticRegExp), undefined, code);
	}
});

test('ignores mutable bindings in functions that are not evaluated', t => {
	t.assert.strictEqual(evaluate('let value = true; const result = (() => value, 2);', getStaticValueForControlFlow)?.value, 2);
});
