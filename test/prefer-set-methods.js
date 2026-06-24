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
		'const a = new Set(); const b = new Set(); [...a].filter(value => !b.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => { return b.has(value); });',
		'const a = new Set(); const b = new Set(); [...a].filter(({value}) => b.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter((...value) => b.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => b?.has(value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => b["has"](value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => b.has(/* keep */ value));',
		'const a = new Set(); const b = new Set(); [...a].filter(value => other.has(value));',
		typescript('function foo(a: Set<string>, b: string[]) { new Set([...a, ...b]); }'),
		typescript('function foo(values: Set<Set<string>>) { return [...values].filter((value: Set<string>) => value.has(value)); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return ([...a].filter(value => b.has(value)) as string[]); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return ([...a].filter(value => b.has(value)) satisfies string[]); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return ([...a].filter(value => b.has(value)) as string[]).map(fn); }'),
		typescript('function foo(a: Set<string>, b: Set<string>) { return ([...a].filter(value => b.has(value))!).map(fn); }'),
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
