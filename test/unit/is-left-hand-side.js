import test from 'node:test';
import {Linter} from 'eslint';
import {isLeftHandSide} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const getVerdict = code => {
	let verdict;
	const messages = new Linter().verify(code, {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {
			test: {
				rules: {
					capture: {
						create: () => ({
							MemberExpression(node) {
								if (node.property.name === 'target') {
									verdict = isLeftHandSide(node);
								}
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	if (messages.length > 0 || verdict === undefined) {
		throw new Error(`Unable to inspect target in ${code}: ${JSON.stringify(messages)}`);
	}

	return verdict;
};

test('reference targets remain targets through TypeScript wrappers', t => {
	for (const expression of [
		'object.target',
		'(object.target as number)',
		'(<number>object.target)',
		'object.target!',
		'(object.target satisfies number)',
		'((object.target as number)!)',
	]) {
		for (const code of [
			`${expression} = value;`,
			`${expression} += value;`,
			`${expression}++;`,
			`--${expression};`,
			`delete ${expression};`,
			`[${expression}] = values;`,
			`({value: ${expression}} = source);`,
			`[${expression} = value] = values;`,
			`[...${expression}] = values;`,
			`for (${expression} of values) {}`,
			`for (${expression} in source) {}`,
		]) {
			t.assert.strictEqual(getVerdict(code), true, code);
		}
	}
});

test('optional-chain delete remains a reference target', t => {
	for (const code of [
		'delete object?.target;',
		'delete (object?.target as number);',
		'delete ((object?.target as number)!);',
		'delete object.target<string>;',
	]) {
		t.assert.strictEqual(getVerdict(code), true, code);
	}
});

test('wrappers around reads do not make them reference targets', t => {
	for (const code of [
		'value = (object.target as number);',
		'object.target!;',
		'object?.target;',
		'consume((object?.target as number)!);',
		'delete (object.target as number).value;',
		'(object.target as number).value = value;',
		'[value = object.target!] = values;',
		'for (value of object.target!) {}',
		'({value: object.target});',
		'({[object.target!]: value} = source);',
	]) {
		t.assert.strictEqual(getVerdict(code), false, code);
	}
});
