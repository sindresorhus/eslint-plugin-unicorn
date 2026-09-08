import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const setMethods = ['union', 'intersection', 'difference', 'symmetricDifference'];
const predicateMethods = ['isSubsetOf', 'isSupersetOf', 'isDisjointFrom'];
const declarations = 'const selected = new Set([1, 2]); const other = new Set([2, 3]); const records = new Map([[2, "value"]]);';
const withDeclarations = code => `${declarations} ${code}`;
const typescript = code => ({code, languageOptions: {parser: parsers.typescript}});
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

for (const method of [...setMethods, ...predicateMethods]) {
	testRule.snapshot({
		valid: [
			`unknown.${method}(new Set(unknownOther))`,
			...[
				`selected.${method}(other)`,
				`selected.${method}(new Set([1, 2]))`,
				`selected.${method}(new Set(records))`,
				`selected.${method}(new Set(records.values()))`,
				`selected.${method}(new Set(records.entries()))`,
				`selected.${method}(new Set(other.entries()))`,
				`selected.${method}(new Set(unknown))`,
				`selected.${method}(new Set(unknown.keys()))`,
				`unknown.${method}(new Set(other))`,
				`records.${method}(new Set(other))`,
				`new Set(records.keys()).${method}(other)`,
				`new Set(selected).${method}(unknown)`,
				`new Set(selected).${method}((selected.clear(), other))`,
				`new Set(selected).${method}(new Set([selected.clear()]))`,
				`selected?.${method}(new Set(other))`,
				`selected.${method}?.(new Set(other))`,
				`selected["${method}"](new Set(other))`,
				`selected.${method}(new Set(other), extra)`,
				`selected.${method}(...[new Set(other)])`,
				`selected.${method}(new Set(...other))`,
				`selected.${method}(new Set(other, extra))`,
				`selected.${method}(new Set(other.keys(extra)))`,
				`selected.${method}(new Set(other?.keys()))`,
				`selected.${method}(new Set(other.keys?.()))`,
			].map(code => withDeclarations(code)),
		],
		invalid: [
			...[
				`selected.${method}(new Set(other))`,
				`selected.${method}(new Set(other.keys()))`,
				`selected.${method}(new Set(other.values()))`,
				`selected.${method}(new Set(records.keys()))`,
				`new Set(selected).${method}(other)`,
				`new Set(selected.keys()).${method}(other)`,
				`new Set(selected.values()).${method}(records)`,
			].map(code => withDeclarations(code)),
		],
	});
}

testRule.snapshot({
	valid: [
		...predicateMethods.map(method => withDeclarations(`new Set(selected.${method}(other))`)),
		...[
			'new Set(other)',
			'new Set(selected).add(3)',
			'new Set(selected).has(3)',
			'selected.union(new Set(other).unrelated)',
			'new Set(selected.union)',
			'new Set(unknown.union(other))',
			'new Set(records.union(other))',
			'new Set(selected.union())',
			'new Set(selected.union(other, extra))',
			'new Set(selected?.union(other))',
			'new Set(selected.union?.(other))',
			'new Set(selected["union"](other))',
			'new Set(selected.union(other), extra)',
			'selected.union(new WeakSet(other))',
			'selected.union(Set(other))',
			'selected.union(new Set())',
			'selected.union(new Set(null))',
			'selected.union(new Set(customSetLike))',
		].map(code => withDeclarations(code)),
		'const Set = CustomSet; const selected = new Set(); selected.union(new Set(selected));',
		'class CustomSet extends Set {} const selected = new CustomSet(); new Set(selected.union(other));',
		'let selected = new Set(); new Set(selected.union(other));',
		typescript('function check(selected: Set<number>, other: Set<number>) { selected.union(new Set<number>(other)); }'),
		typescript('function check(selected: Set<number>, other: Set<number>) { new Set<number>(selected).union(other); }'),
		typescript('function check(selected: Set<number>, other: Set<number>) { new Set<number>(selected.union(other)); }'),
		typescript('function check(selected: Set<number> | undefined, other: Set<number>) { selected.union(new Set(other)); }'),
		typeAware('function check(selected: {union(other: unknown): number[]}, other: Set<number>) { return new Set(selected.union(other)); }'),
	],
	invalid: [
		...setMethods.map(method => withDeclarations(`new Set(selected.${method}(other))`)),
		...[
			'const alias = other; selected.union(new Set(alias))',
			'selected.union(new Set((condition ? other : selected)))',
			'new Set((condition ? other : selected)).union(records)',
			'selected.union(new Set(((records)).keys()))',
			'selected.union(new Set(other /* retained */))',
			'selected.union(new Set(/* wrapper comment */ other))',
			'selected.union(new Set(records./* method comment */keys()))',
			'new Set(/* receiver comment */ selected).union(other)',
			'new Set(/* result comment */ selected.union(other))',
			'new Set(selected.union(/* retained */ other)).has(2)',
			'new Set(selected.union(other)).intersection(records)',
			'new Set(new Set(selected).union(new Set(other)))',
			'new Set(selected.union(getOther()))',
			'new Set(selected.union((selected.clear(), other)))',
			'function result() { return new Set(selected.union(other)) }',
			'function result() { throw new Set(selected.union(other)) }',
			'for (const item of new Set(selected.union(other))) {}',
		].map(code => withDeclarations(code)),
		{
			code: withDeclarations('const view = <div>{selected.union(new Set(other))}</div>'),
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		outdent`
			const selected = new Set();
			const other = new Set();
			previous()
			new Set(condition ? selected : other).union(other)
		`,
		outdent`
			const selected = new Set();
			const other = new Set();
			previous()
			new Set((condition ? selected : other).union(other))
		`,
		...[
			'function check(selected: Set<number>, other: ReadonlySet<number>) { return selected.union(new Set(other)); }',
			'function check(selected: Set<number>, records: ReadonlyMap<number, string>) { return selected.union(new Set(records.keys())); }',
			'function check(selected: ReadonlySet<number>, other: Set<number>) { return new Set(selected).union(other); }',
			'function check(selected: Set<number>, other: Set<number>) { return new Set(selected.union(other)); }',
			'function check(selected: Set<number>, other: unknown) { return selected.union(new Set(other as Set<number>)); }',
			'function check(selected: Set<number>, other: unknown) { return new Set(other as Set<number>).union(selected); }',
			'function check(selected: Set<number>, other: unknown) { return new Set(<Set<number>>other).union(selected); }',
			'function check(selected: Set<number>, other: Set<number>) { return selected!.union(new Set(other)); }',
			'function check(selected: Set<number>, other: Set<number>) { return selected.union(new Set(other satisfies Set<number>)); }',
		].map(code => typescript(code)),
		typeAware('function check(selected: Set<number>, records: {value: Map<number, string>}) { return selected.union(new Set(records.value.keys())); }'),
		typeAware('function check(selected: {value: Set<number>}, other: Set<number>) { return new Set(selected.value.union(other)); }'),
	],
});

test('related rules converge without conflicting fixes', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: Object.fromEntries([
			'no-useless-set-construction',
			'prefer-set-methods',
			'no-useless-spread',
			'no-useless-iterator-to-array',
			'no-useless-collection-argument',
		].map(name => [`unicorn/${name}`, 'error'])),
	};
	const code = withDeclarations('selected.union(new Set([...other])); selected.intersection(new Set(records.keys().toArray())); new Set(new Set([...selected, ...other]));');
	const result = linter.verifyAndFix(code, config);
	t.deepEqual(result.messages, []);
	t.is(result.output, withDeclarations('selected.union(other); selected.intersection(records); selected.union(other);'));
	t.false(linter.verifyAndFix(result.output, config).fixed);
});
