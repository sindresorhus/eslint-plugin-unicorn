import test from 'ava';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const loop = (body = 'save(names[index], scores[index]);') => `for (let index = 0; index < Math.min(names.length, scores.length); index++) { ${body} }`;
const typescript = code => ({code, languageOptions: {parser: parsers.typescript}});
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

testRule.snapshot({
	valid: [
		'names.map((name, index) => scores[index])',
		...[
			'names.length',
			'length',
			'Math.max(names.length, scores.length)',
			'Math.min(names.length, names.length)',
			'Math.min(names.length, scores.length, 5)',
			'Math.min(...lengths)',
		].map(bound => loop().replace('Math.min(names.length, scores.length)', () => bound)),
		...['var', 'const'].map(kind => loop().replace('let index', () => `${kind} index`)),
		...['index = 1', 'index = 0, length = 5'].map(initializer => loop().replace('index = 0', () => initializer)),
		...['index += 2', 'index--', 'index = index + 1'].map(update => loop().replace('index++', () => update)),
		loop().replace('index <', 'index <='),
		loop().replace('index < Math.min(names.length, scores.length)', 'index < names.length && index < scores.length'),
		loop().replace(' { ', ' ').replace(' }', ''),
		...[
			'save(names[index]);',
			'save(names[index], scores[index], index);',
			'save(names[index + 1], scores[index]);',
			'save(names?.[index], scores[index]);',
			'save(names[index], scores[index]); names.push("new");',
			'save(names[index], scores[index]); scores = replacement;',
			'save(names[index], scores[index]); consume(scores);',
			'save(names[index], scores[index]); index++;',
			'names[index] = scores[index];',
			'names[index]++; save(scores[index]);',
			'delete names[index]; save(scores[index]);',
			'[names[index]] = scores[index];',
			'({value: names[index]} = scores[index]);',
			'for (names[index] of scores[index]) {}',
			'for (names[index] in scores[index]) {}',
			'names[index](scores[index]);',
			'names[index]?.(scores[index]);',
			'names[index]`tag`; save(scores[index]);',
			'callbacks.push(() => save(names[index], scores[index]));',
			'class Pair { value = save(names[index], scores[index]); }',
			'save(names[index], scores[index]); { const names = other; save(names[index]); }',
			'save(names[index], scores[index]); { const index = 0; save(names[index]); }',
		].map(body => loop(body)),
		loop().replaceAll('names', 'object.names'),
		`const names = 'abc'; ${loop()}`,
		`const names = {0: 'a', length: 1}; ${loop()}`,
		`const scores = new Set(); ${loop()}`,
		typescript(`declare const names: string; declare const scores: number[]; ${loop()}`),
		typescript(loop('names[index]!(); save(scores[index]);')),
		typescript(loop('(names[index]<string>)(scores[index]);')),
		typescript(loop('(names[index]<string>)`tag`; save(scores[index]);')),
		typescript(loop('(names[index] as number) = scores[index];')),
		typeAware(`declare const names: {length: number; [index: number]: string}; declare const scores: number[]; ${loop()}`),
	],
	invalid: [
		{code: loop().replaceAll('names', 'Iterators'), languageOptions: {ecmaVersion: 2022}},
		loop(),
		`function pair(names, scores) { ${loop()} }`,
		`const names = ['a', 'b']; const scores = [1]; ${loop()}`,
		`const names = []; const scores = [1]; ${loop()}`,
		`const names = new Uint8Array(2); const scores = new Float64Array(3); ${loop()}`,
		`const names = new BigInt64Array(2); const scores = new BigUint64Array(3); ${loop()}`,
		...['++index', 'index += 1'].map(update => loop().replace('index++', () => update)),
		loop().replace('index < Math.min(names.length, scores.length)', 'Math.min(names.length, scores.length) > index'),
		loop().replace('scores.length)', 'scores.length, ranks.length)').replace('scores[index]', 'scores[index], ranks[index]'),
		...[
			'save(names[index], scores[index], names[index]);',
			'const name = names[index]; const score = scores[index]; save(name, score);',
			'if (names[index]) { save(names[index], scores[index]); }',
			'if (!names[index]) { continue; } save(names[index], scores[index]); break;',
			'save((names)[(index)], ((scores[index])));',
			'save(names[index].value, scores[index].value);',
			'names[index].save(scores[index]);',
			'names[index].value = scores[index];',
			'save(name, names[index], scores[index]);',
			'save(names[index], scores[index]); { const name = "inner"; use(name); }',
			'save(names[index], scores[index]); { const index = 1; use(index); }',
			'/* keep body comment */ save(names[index], scores[index]);',
			'save(names[/* keep access comment */ index], scores[index]);',
		].map(body => loop(body)),
		`const name = 'existing'; ${loop('save(name, names[index], scores[index]);')}`,
		loop().replaceAll('names', 'items').replaceAll('scores', 'item'),
		loop().replaceAll('names', 'data').replaceAll('scores', 'metadata'),
		loop().replace('index = 0;', 'index = 0; /* keep header comment */'),
		loop().replace('let index', '/* before declaration */ let index'),
		loop().replace('index++)', 'index++ /* after update */)'),
		typescript(`function pair(names: readonly string[], scores: number[]) { ${loop()} }`),
		typescript(loop('save(names[index]!, scores[index] as number);')),
		typescript(loop('save(<string>names[index], scores[index] satisfies number);')),
		typescript(loop('save(names[index]<string>, scores[index]);')),
		loop('save(names[index]in object, scores[index]instanceof Number);'),
		typescript(loop('save(names[index]as string, scores[index]satisfies number);')),
		{
			code: loop('render(<Card name={names[index]} score={scores[index]} />);').replaceAll('names', 'Cards'),
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		typeAware(`declare const names: string[]; declare const scores: readonly number[]; ${loop()}`),
		typeAware(`declare const names: Uint8Array; declare const scores: Float64Array; ${loop()}`),
		loop('save(names[index], scores[index]); { const names = other; const index = 0; save(names[index]); }'),
	],
});

test('suggestions preserve token boundaries around parenthesized receivers', t => {
	const code = `function pair(names, scores) { ${loop('save(typeof(names)[index], scores[index]); return(names)[index];')} }`;
	const linter = new Linter();
	const [message] = linter.verify(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/prefer-iterator-zip': 'error'},
	});
	const {fix} = message.suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.is(output, 'function pair(names, scores) { for (const [name, score] of Iterator.zip([names, scores])) { save(typeof name, score); return name; } }');
});

test('suggestions work with related rules and ordinary autofixing does not change the loop', t => {
	const ruleNames = [
		'prefer-iterator-zip',
		'no-for-loop',
		'prefer-iterator-concat',
		'prefer-iterator-helpers',
		'no-duplicate-loops',
		'no-unreadable-for-of-expression',
		'no-loop-iterable-mutation',
		'no-invalid-argument-count',
		'no-nonstandard-builtin-properties',
		'no-useless-iterator-to-array',
		'prefer-iterator-to-array',
		'prefer-iterator-to-array-at-end',
	];
	const config = {
		plugins: {unicorn: plugin},
		rules: Object.fromEntries(ruleNames.map(name => [`unicorn/${name}`, 'error'])),
	};
	const linter = new Linter();
	const code = loop();
	const messages = linter.verify(code, config);
	t.deepEqual(messages.map(({ruleId}) => ruleId), ['unicorn/prefer-iterator-zip']);
	t.is(linter.verifyAndFix(code, config).output, code);
	const {fix} = messages[0].suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.is(output, 'for (const [name, score] of Iterator.zip([names, scores])) { save(name, score); }');
	t.deepEqual(linter.verify(output, config), []);
	t.is(plugin.configs.recommended.rules['unicorn/prefer-iterator-zip'], 'error');
	t.is(plugin.configs.unopinionated.rules['unicorn/prefer-iterator-zip'], 'off');
});
