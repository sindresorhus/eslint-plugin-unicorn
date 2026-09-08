import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			projectService: {
				allowDefaultProject: ['*.ts'],
			},
		},
	},
});

test.snapshot({
	valid: [
		'new Set([...a, ...b]);',
		'const a = []; const b = []; new Set([...a, ...b]);',
		'const a = new Set(); const b = []; new Set([...a, ...b]);',
		'const a = new Set(); const b = new Set(); new Set([first, ...a, ...b]);',
		'const a = new Set(); const b = new Set(); new Set([, ...a, ...b]);',
		'const a = new Set(); const b = new Set(); new Set([...a, item, ...b]);',
		'const Set = class {}; const a = new Set(); const b = new Set(); new Set([...a, ...b]);',
		'new Foo([...a, ...b]);',
		'const a = new Set(); const b = new Set(); new Set([/* keep */ ...a, ...b]);',
		'const a = new Set(); const b = new Set(); Array.from(a).filter(value => b.has(value));',
		'const a = new Set(); const b = new Set(); foo([...a].filter(value => b.has(value)));',
		'const a = new Set(); const b = new Set(); new Foo([...a].filter(value => b.has(value)));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => b.has(value)).map(fn);',
		'const a = new Set(); const b = new Set(); new Set(/* keep */ [...a].filter(value => b.has(value)));',
		'const a = new Set(); const b = new Set(); [...a].filter(async value => b.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => b.has(value) && value);',
		'const a = new Set(); const b = new Set(); [...a].filter(value => { return b.has(value); });',
		'const a = new Set(); const b = new Set(); [...a].filter(({value}) => b.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter((...value) => b.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => b?.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => b["has"](value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => b.has(/* keep */ value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => other.has(value));',
		'const a = new Set(); const b = new Set(); Array.from(a).filter(value => !b.has(value));',
		'const a = new Set(); const b = new Set(); foo([...a].filter(value => !b.has(value)));',
		'const a = new Set(); const b = new Set(); new Foo([...a].filter(value => !b.has(value)));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => !b.has(value)).map(fn);',
		'const a = new Set(); const b = new Set(); [...a].filter(value => !(b.has(value)) && other);',
		'const a = new Set(); const b = new Set(); [...a].filter(value => !b?.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => !b["has"](value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => !b.has(/* keep */ value));',
		'const a = new Set(); const b = []; [...a].filter(value => !b.has(value));',
		'const a = []; const b = new Set(); [...a].filter(value => !b.has(value));',
		typescript('function foo(a: Set<string>, b: string[]) { new Set([...a, ...b]); }'),
		typescript('function foo(values: Set<Set<string>>) { return [...values].filter((value: Set<string>) => value.has(value)); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return ([...a].filter(value => b.has(value)) as string[]); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return ([...a].filter(value => b.has(value)) satisfies string[]); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return ([...a].filter(value => b.has(value)) as string[]).map(fn); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return ([...a].filter(value => b.has(value))!).map(fn); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return (([...a].filter(value => b.has(value)) as string[])!).map(fn); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return foo(([...a].filter(value => b.has(value)) as string[])!); }'),
		typescript('type Set<T> = T[]; function foo(a: Set<string>, b: Set<string>) { new Set([...a, ...b]); }'),
		typescript('function foo() { type Set<T> = T[]; const a: Set<string> = []; const b: Set<string> = []; new Set([...a, ...b]); }'),
		typeAware('import {Set} from "immutable"; declare const a: Set<string>; declare const b: Set<string>; new Set([...a, ...b]);'),
		typeAware('interface Set<T> { has(value: T): boolean } declare const a: Set<string>; declare const b: Set<string>; new Set([...a, ...b]);'),
		typeAware('declare const a: unknown; declare const b: Set<string>; new Set([...a, ...b]);'),
		typescript('function foo(a: Set<string>, b: Set<string>) { new Set([...a, ...((a.clear(), b) as Set<string>)]); }'),
		typeAware('declare const a: Set<string>; declare function getSetThatMutatesA(): Set<string>; new Set([...a, ...getSetThatMutatesA()]);'),
		typeAware('declare function getSet(): Set<string>; declare const b: Set<string>; new Set([...getSet(), ...b]);'),
		'const a = new Set(); new Set([...a, ...new Set((a.clear(), []))]);',
		typeAware('declare const a: Set<string>; declare function getOtherSet(): Set<string>; [...a].filter(value => getOtherSet().has(value));'),
		typeAware('declare const a: Set<string>; declare function getOtherSet(): Set<string>; [...a].filter(value => !getOtherSet().has(value));'),
	],
	invalid: [
		'const a = new Set(); const b = new Set(); new Set([...a, ...b]);',
		'const a = new Set(); const b = new Set(); const c = new Set(); new Set([...a, ...b, ...c]);',
		'const a = new Set(); const b = new Set(); const c = new Set(); new Set([...(condition ? a : b), ...c]);',
		'const a = new Set(); const c = new Set(); new Set([...(condition ? a : a), ...c]);',
		outdent`
			const a = new Set();
			const b = new Set();
			const c = new Set();
			foo
			new Set([...(condition ? a : b), ...c]);
		`,
		'new Set([...(new Set()), ...(new Set())]);',
		typescript('function foo(a: Set<string>, b: Set<string>) { new Set([...a, ...b]); }'),
		typescript('function foo(a: ReadonlySet<string>, b: ReadonlySet<string>) { new Set([...a, ...b]); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { new Set([...(a satisfies Set<string>), ...(b as Set<string>)]); }'),
		typeAware('type Items = Set<string>; declare const a: Items; declare const b: Set<string>; new Set([...a, ...b]);'),
		'const a = new Set(); const b = new Set(); [...a].filter(value => b.has(value));',
		'const a = new Set(); const b = new Set(); new Set([...a].filter(value => b.has(value)));',
		typescript('function foo(a: Set<string>, b: Set<string>) { return new Set(([...a].filter(value => b.has(value)) as string[])); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return new Set((([...a].filter(value => b.has(value)) as string[])!)); }'),
		'const a = new Set(); const b = new Set(); [...a].filter(value => !b.has(value));',
		'const a = new Set(); const b = new Set(); new Set([...a].filter(value => !b.has(value)));',
		typescript('function foo(a: Set<string>, b: Set<string>) { return [...a].filter(value => !b.has(value)); }'),
		typescript('function foo(a: ReadonlySet<string>, b: ReadonlySet<string>) { return [...a].filter(value => !b.has(value)); }'),
		typeAware('type Items = Set<string>; declare const a: Items; declare const b: Set<string>; [...a].filter(value => !b.has(value));'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return new Set(([...a].filter(value => !b.has(value)) as string[])); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return new Set((([...a].filter(value => !b.has(value)) as string[])!)); }'),
		outdent`
			const a = new Set();
			const b = new Set();
			const c = new Set();
			foo
			new Set([...(condition ? a : b)].filter(value => !c.has(value)));
		`,
		outdent`
			const a = new Set();
			const b = new Set();
			const c = new Set();
			foo
			new Set([...(condition ? a : b)].filter(value => c.has(value)));
		`,
		'const a = new Set(); const c = new Set(); new Set([...(condition ? a : a)].filter(value => c.has(value)));',
		typescript('function foo(a: Set<string>, b: Set<string>) { return [...a].filter(value => b.has(value)); }'),
		typescript('function foo(a: ReadonlySet<string>, b: ReadonlySet<string>) { return [...a].filter(value => b.has(value)); }'),
		typeAware('type Items = Set<string>; declare const a: Items; declare const b: Set<string>; [...a].filter(value => b.has(value));'),
		outdent`
			const a = new Set();
			const b = new Set();
			const intersection = [...a]
				.filter(value => b.has(value));
		`,
	],
});

for (const method of ['every', 'some']) {
	test.snapshot({
		valid: [
			`[...a].${method}(value => b.has(value));`,
			`const a = []; const b = new Set(); [...a].${method}(value => b.has(value));`,
			`const a = new Set(); const b = new Map(); [...a].${method}(value => b.has(value));`,
			...[
				`Array.from(a).${method}(value => b.has(value))`,
				`[...a, ...b].${method}(value => b.has(value))`,
				`[...a].${method}(async value => b.has(value))`,
				`[...a].${method}(value => { return b.has(value); })`,
				`[...a].${method}((value, index) => b.has(value))`,
				`[...a].${method}(({value}) => b.has(value))`,
				`[...a].${method}(value => b.has(other))`,
				`[...a].${method}(value => !b.has(value))`,
				`[...a].${method}(value => b.has(value) && value)`,
				`[...a].${method}(value => b.has(value), b)`,
				`[...a].${method}?.(value => b.has(value))`,
				`[...a]?.${method}(value => b.has(value))`,
				`[...a]['${method}'](value => b.has(value))`,
				`[...a].${method}(value => b?.has(value))`,
				`[...a].${method}(value => b.has?.(value))`,
				`[...a].${method}(value => b['has'](value))`,
				`[...a].${method}(value => b.has(value, other))`,
				`[...a].${method}(value => b.has(/* keep */ value))`,
				`[...a].${method}(value => (value ? b : a).has(value))`,
			].map(code => `const a = new Set(); const b = new Set(); ${code};`),
			typescript(`function foo(a: Set<Set<string>>) { return [...a].${method}((value: Set<string>) => value.has(value)); }`),
			typeAware(`declare const a: Set<string>; declare function getOtherSet(): Set<string>; [...a].${method}(value => getOtherSet().has(value));`),
		],
		invalid: [
			...[
				`[...a].${method}(value => b.has(value))`,
				`foo([...a].${method}(value => b.has(value)))`,
				`new Foo([...a].${method}(value => b.has(value)))`,
				`[...a].${method}(value => b.has(value)).toString()`,
				`[...a].${method}(value => b.has(value)) ** 2`,
				`![...a].${method}(value => b.has(value))`,
				`[...a].${method}(value => b.has(value)) && other`,
				`([...(a)].${method}(value => (b).has(value)))`,
				`function foo() { return[...a].${method}(value => b.has(value)); }`,
				`[...(condition ? a : b)].${method}(value => b.has(value))`,
			].map(code => `const a = new Set(); const b = new Set(); ${code};`),
			typescript(`function foo(a: Set<string>, b: Set<string>) { return [...a].${method}(value => b.has(value)); }`),
			typescript(`function foo(a: ReadonlySet<string>, b: ReadonlySet<string>) { return [...a].${method}(value => b.has(value)); }`),
			typescript(`function foo(a: Set<string>, b: Set<string>) { return [...(a as Set<string>)].${method}(value => (b satisfies Set<string>).has(value)); }`),
			typescript(`function foo(a: Set<string>, b: Set<string>) { return [...a!].${method}(value => b!.has(value))!; }`),
			typeAware(`type Items = Set<string>; declare const a: Items; declare const b: Set<string>; [...a].${method}(value => b.has(value));`),
		],
	});
}

for (const method of ['intersection', 'difference']) {
	test.snapshot({
		valid: [
			`a.${method}(b).size === 0;`,
			`const a = new Set(); const b = []; a.${method}(b).size === 0;`,
			...[
				`a.${method}(b).size == 0`,
				`a.${method}(b).size > 0`,
				`a.${method}(b).size === 1`,
				`a.${method}(b).size === 0n`,
				`a.${method}(b).size === '0'`,
				`a.${method}(b).length === 0`,
				`a.${method}(b)['size'] === 0`,
				`a['${method}'](b).size === 0`,
				`a?.${method}(b).size === 0`,
				`a.${method}?.(b).size === 0`,
				`a.${method}(b)?.size === 0`,
				`a.${method}(b, other).size === 0`,
				`a.${method}(...b).size === 0`,
				`a.${method}(b).size /* keep */ === 0`,
			].map(code => `const a = new Set(); const b = new Set(); ${code};`),
		],
		invalid: [
			...['===', '!=='].flatMap(operator => [
				`a.${method}(b).size ${operator} 0`,
				`0 ${operator} a.${method}(b).size`,
			]).map(code => `const a = new Set(); const b = new Set(); ${code};`),
			`const a = new Set(); const b = new Set(); foo((a.${method}(b).size) === (0));`,
			`const a = new Set(); const b = new Set(); (a.${method}(b).size !== 0).toString();`,
			`const a = new Set(); const b = new Set(); !(a.${method}(b).size === 0);`,
			typescript(`function foo(a: ReadonlySet<string>, b: ReadonlySet<string>) { return a.${method}(b).size === 0; }`),
			typescript(`function foo(a: Set<string>, b: Set<string>) { return (a as Set<string>).${method}(b!).size !== 0; }`),
			typeAware(`type Items = Set<string>; declare const a: Items; declare const b: Set<string>; a.${method}(b).size === 0;`),
			outdent`
				const a = new Set();
				const b = new Set();
				foo
				0 === (condition ? a : b).${method}(b).size;
			`,
		],
	});
}

for (const negation of ['', '!']) {
	const method = negation ? 'difference' : 'intersection';
	test({
		valid: [
			`const a = new Set(); const b = new Set(); [...a].filter(value => ${negation}(value ? b : a).has(value));`,
			`const a = new Set(); const b = new Set(); new Set([...a].filter(value => ${negation}(value ? b : a).has(value)));`,
		],
		invalid: ['return', 'throw', 'yield'].map(keyword => ({
			code: `const a = new Set(); const b = new Set(); function* foo() { ${keyword}[...a].filter(value => ${negation}b.has(value)); }`,
			errors: [
				{
					messageId: `prefer-set-methods/${method}`,
					suggestions: [
						{
							messageId: `prefer-set-methods/${method}-suggestion`,
							output: `const a = new Set(); const b = new Set(); function* foo() { ${keyword} a.${method}(b); }`,
						},
					],
				},
			],
		})),
	});
}

for (const method of ['filter', 'every', 'some']) {
	test.snapshot({
		valid: [],
		invalid: [
			`const a = new Set(); const b = new Set(); const c = new Set(); [...a].${method}(value => (condition ? b : c).has(value));`,
			typescript(`function foo(a: Set<string>, b: Set<string>) { return [...a].${method}(<T extends string>(value: T) => b.has(value)); }`),
			{
				code: `const a = new Set(); const b = new Set(); const element = <div>{[...a].${method}(value => b.has(value))}</div>;`,
				languageOptions: {
					parserOptions: {
						ecmaFeatures: {
							jsx: true,
						},
					},
				},
			},
		],
	});
}
