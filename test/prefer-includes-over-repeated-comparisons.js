import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = (code, filename = 'file.ts') => ({
	code,
	filename,
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['file.*']}},
	},
});

test({
	valid: [],
	invalid: [
		{
			code: 'value !== "a" && value !== "b" && value !== "c";',
			errors: [{messageId: 'prefer-includes-over-repeated-comparisons'}],
		},
		{
			...typeAware('declare const value: string; value == "a" || value == "b" || value == "c";'),
			errors: [{messageId: 'prefer-includes-over-repeated-comparisons'}],
		},
		{
			...typeAware('declare const value: number; value != 1 && value != 2 && value != 3;'),
			errors: [{messageId: 'prefer-includes-over-repeated-comparisons'}],
		},
		{
			...typeAware('declare const value: string; value === "a" || value == "b" || value === "c";'),
			errors: [{messageId: 'prefer-includes-over-repeated-comparisons'}],
		},
		...[
			'function check<T extends string>(value: T) { return value == "a" || value == "b" || value == "c"; }',
			'function check<T extends number>(value: T) { return value != 1 && value != 2 && value != 3; }',
			'function check<U extends string, T extends U>(value: T) { return value == "a" || value == "b" || value == "c"; }',
			'function check<T extends "a" | "b">(value: string, other: T) { return value == other || value == "c" || value == "d"; }',
		].map(code => ({
			...typeAware(code),
			errors: [{messageId: 'prefer-includes-over-repeated-comparisons'}],
		})),
	],
});

test.snapshot({
	valid: [
		...[
			['===', '||'],
			['!==', '&&'],
			['==', '||'],
			['!=', '&&'],
		].map(([comparisonOperator, logicalOperator]) => typeAware(outdent`
			function check<T extends "a" | "b" | "c">(value: T) {
				return value ${comparisonOperator} "a" ${logicalOperator} value ${comparisonOperator} "b" ${logicalOperator} value ${comparisonOperator} "c";
			}
		`)),
		...['unknown', 'any', 'String', 'string | number'].map(type => typeAware(`function check<T extends ${type}>(value: T) { return value == "a" || value == "b" || value == "c"; }`)),
		typeAware('function check<T>(value: T) { return value == "a" || value == "b" || value == "c"; }'),
		typeAware('function check<T extends string>(value: T) { return value == "a" || (value as unknown) == "b" || value == "c"; }'),
		{
			code: 'function check<T extends string>(value: T) { return value == "a" || value == "b" || value == "c"; }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			type Spec = {type: 'range' | 'tag' | 'version'; name: string} | {type: 'git'; name: null};

			const getName = (spec: Spec): string | undefined => {
				if (spec.type === 'range' || spec.type === 'tag' || spec.type === 'version') {
					return spec.name;
				}
			};
		`),
		typeAware('declare const value: "a" | "b" | "c"; value === "a" || value === "b" || value === "c";'),
		typeAware('declare const value: 1 | 2 | 3; value === 1 || value === 2 || value === 3;'),
		typeAware('declare const value: string | number; value === "a" || value === "b" || value === "c";'),
		typeAware('/** @param {"a" | "b" | "c"} value */ function check(value) { return value === "a" || value === "b" || value === "c"; }', 'file.js'),
		typeAware('declare const object: {value: "a" | "b" | "c"}; "a" === object.value || object.value === "b" || "c" === object.value;'),
		...[
			'((value))',
			'value!',
			'(value as string)',
			'(<string>value)',
			'(value satisfies string)',
		].map(reference => typeAware(`declare const value: "a" | "b" | "c"; ${reference} === "a" || ${reference} === "b" || ${reference} === "c";`)),
		{
			...typeAware('declare const value: "a" | "b"; "a" === value || "b" === value;'),
			options: [{minimumComparisons: 2}],
		},
		'value === "a";',
		'value === "a" || otherValue === "b";',
		'value == "a" || value == "b";',
		'value !== "a" && value !== "b";',
		'value === "a" || isValue(value);',
		'value === "a" || value !== "b";',
		'value === "a" || value === "b" || otherValue === "c";',
		'getValue() === "a" || getValue() === "b";',
		'getObject().value === "a" || getObject().value === "b";',
		'object[getKey()] === "a" || object[getKey()] === "b";',
		'value === getValue() || value === "b";',
		'value === "a" || value === getValue();',
		'value === (otherValue = "a") || value === "b";',
		'value === ++otherValue || value === "b";',
		'value === Number.NaN || value === 1;',
		'value === NaN || value === 1;',
		'Number.NaN === value || Number.NaN === otherValue;',
		'NaN === value || NaN === otherValue;',
		'foo?.bar === "a" || foo?.bar === "b";',
		'foo?.bar === "a" || foo.bar === "b";',
		'foo.bar === "a" || foo?.bar === "b";',
		'foo[bar?.baz] === "a" || foo[bar?.baz] === "b";',
		'foo[bar?.()] === "a" || foo[bar?.()] === "b";',
		'(foo?.bar).baz === "a" || (foo?.bar).baz === "b";',
		'value === "a" || value === foo?.bar;',
		'value === (foo?.bar ?? "a") || value === "b";',
		'foo === bar || bar === foo;',
		'foo === foo || foo === foo;',
		'foo === bar || foo === foo;',
		'foo === 1 || bar === 1;',
		'value === "a" || value === "b";',
		'const modes = new Set(["foo"]); modes.clear(); value === (modes.size ? 1 : NaN) || value === 2;',
		'const modes = new Set(["foo"]); modes.clear(); value === ((modes.size && NaN) || other) || value === 2;',
		{
			code: 'const modes = new Set(["foo"]); modes.clear(); value === ((modes.size ? NaN : other) as number) || value === 2;',
			languageOptions: {parser: parsers.typescript},
		},
		'"a" === value || "b" === value;',
		'value === "a" || "b" === value;',
		'value === first || value === second;',
		'args[0] === "-h" || args[0] === "--help";',
		'object.value === "a" || object.value === "b";',
		'object.foo === "a" || object["foo"] === "b";',
		'object[key] === "a" || object[key] === "b";',
		'value === object.a || value === object.b;',
		'(value === "a") || (value === "b");',
		'(value === "a" || value === "b") && otherValue;',
		// Distinct expressions compared against the same `undefined` value (#3304)
		'state.a === undefined || state.b === undefined || state.c === undefined;',
		'undefined === a || undefined === b || undefined === c;',
		// `null` is a literal (not a reference), so it behaves the same way
		'a === null || b === null || c === null;',
		// A shared subject early on is dropped once a later operand compares a distinct expression
		'a === undefined || a === "x" || b === undefined;',
		// TypeScript-wrapped `undefined` is still excluded as a shared reference
		{
			code: 'a === (undefined as any) || b === (undefined as any) || c === (undefined as any);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'value === "a" || value === "b";',
			options: [{minimumComparisons: 4}],
		},
		{
			code: '(foo?.bar as Foo).baz === "a" || (foo?.bar as Foo).baz === "b";',
			languageOptions: {parser: parsers.typescript},
		},
		'foo?.bar === "a" || foo?.bar === "b" || foo?.bar === "c";',
		// Both operands of the first comparison stay shared, so there is no single subject
		'foo === bar || foo === bar || foo === bar;',
		// A comparison of the shared reference with itself has no compared value
		'foo === 1 || foo === 2 || foo === foo;',
		'value === "a" && value === "b" && value === "c";',
		'value !== "a" || value !== "b" || value !== "c";',
		'value !== "a" && value === "b" && value !== "c";',
		'value !== "a" ?? value !== "b" ?? value !== "c";',
		'value !== "a" && value !== "b" && otherValue !== "c";',
		'getValue() !== "a" && getValue() !== "b" && getValue() !== "c";',
		'value !== "a" && value !== getValue() && value !== "c";',
		'value !== "a" && value !== ++otherValue && value !== "c";',
		'foo?.bar !== "a" && foo?.bar !== "b" && foo?.bar !== "c";',
		'value !== "a" && value !== foo?.bar && value !== "c";',
		'value !== NaN && value !== 1 && value !== 2;',
		'Number.NaN !== value && Number.NaN !== otherValue && Number.NaN !== thirdValue;',
		'state.a !== undefined && state.b !== undefined && state.c !== undefined;',
		'foo !== bar && foo !== bar && foo !== bar;',
		'foo !== 1 && foo !== 2 && foo !== foo;',
		{
			code: 'value !== "a" && value !== "b" && value !== "c";',
			options: [{minimumComparisons: 4}],
		},
		typeAware('declare const value: "a" | "b" | "c"; value !== "a" && value !== "b" && value !== "c";'),
		...[
			['==', '||'],
			['!=', '&&'],
		].flatMap(([comparisonOperator, logicalOperator]) => [
			`value ${comparisonOperator} "a" ${logicalOperator} value ${comparisonOperator} "b" ${logicalOperator} value ${comparisonOperator} "c";`,
			{
				code: `declare const value: string; value ${comparisonOperator} "a" ${logicalOperator} value ${comparisonOperator} "b" ${logicalOperator} value ${comparisonOperator} "c";`,
				languageOptions: {parser: parsers.typescript},
			},
			...[
				'unknown',
				'any',
				'String',
				'"a" | "b" | "c"',
				'string | number',
			].map(type => typeAware(outdent`
				declare const value: ${type};
				value ${comparisonOperator} "a" ${logicalOperator} value ${comparisonOperator} "b" ${logicalOperator} value ${comparisonOperator} "c";
			`)),
			typeAware(outdent`
				declare const value: number;
				value ${comparisonOperator} "1" ${logicalOperator} value ${comparisonOperator} "2" ${logicalOperator} value ${comparisonOperator} "3";
			`),
			...['any', 'unknown', 'String', 'number', 'string | undefined'].map(type => typeAware(outdent`
				declare const value: string;
				declare const other: ${type};
				value ${comparisonOperator} "a" ${logicalOperator} value ${comparisonOperator} "b" ${logicalOperator} value ${comparisonOperator} other;
			`)),
			typeAware(`declare const value: number; value ${comparisonOperator} NaN ${logicalOperator} value ${comparisonOperator} 1 ${logicalOperator} value ${comparisonOperator} 2;`),
			typeAware(`declare const value: boolean; value ${comparisonOperator} true ${logicalOperator} value ${comparisonOperator} false ${logicalOperator} value ${comparisonOperator} true;`),
			typeAware(`declare const value: bigint; value ${comparisonOperator} 1n ${logicalOperator} value ${comparisonOperator} 2n ${logicalOperator} value ${comparisonOperator} 3n;`),
		]),
		typeAware('declare const value: string; value == "a" || value === "b" || value === 3;'),
		'value === "a" || value == "b" || value === "c";',
		...['any', 'unknown', 'number'].map(type => typeAware(`declare const value: string; value == "a" || (value as unknown as ${type}) == "b" || value == "c";`)),
		typeAware('declare const value: string; declare function getValue(): string; value != "a" && value != getValue() && value != "c";'),
		typeAware(outdent`
			type Spec = {type: 'range' | 'tag' | 'version'; name: string} | {type: 'git'; name: null};

			const getName = (spec: Spec): string | undefined => {
				if (spec.type !== 'range' && spec.type !== 'tag' && spec.type !== 'version') {
					return;
				}

				return spec.name;
			};
		`),
	],
	invalid: [
		'value === "a" || value === "b" || value === "c";',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return NaN; }}); value === (object.value ? NaN : other) || value === 2 || value === 3;',
		// `undefined`/`null` are fine as compared values when the subject is shared (#3304)
		'value === undefined || value === "a" || value === "b";',
		{
			code: 'value === null || value === undefined;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === "a" || value === "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: '"a" === value || "b" === value;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === "a" || "b" === value;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === first || value === second;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'args[0] === "-h" || args[0] === "--help";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'object.value === "a" || object.value === "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'object.foo === "a" || object["foo"] === "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'object[key] === "a" || object[key] === "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === object.a || value === object.b;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: '(value === "a") || (value === "b");',
			options: [{minimumComparisons: 2}],
		},
		{
			code: '(value === "a" || value === "b") && otherValue;',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value === "a" || value === "b" || value === "c";',
			options: [{minimumComparisons: 3}],
		},
		{
			code: outdent`
				value! === "a" || value! === "b" || value! === "c";
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value satisfies string) === "a" || (value satisfies string) === "b" || (value satisfies string) === "c";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value as {foo?: string}) === "a" || (value as {foo?: string}) === "b" || (value as {foo?: string}) === "c";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(object satisfies Foo).value === "a" || (object satisfies Foo).value === "b" || (object satisfies Foo).value === "c";',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const value: string; value === "a" || value === "b" || value === "c";'),
		typeAware('declare const value: number; value === 1 || value === 2 || value === 3;'),
		{
			code: 'declare const value: "a" | "b" | "c"; value === "a" || value === "b" || value === "c";',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const value: string | number; if (typeof value === "string") { value === "a" || value === "b" || value === "c"; }'),
		typeAware('/** @param {string} value */ function check(value) { return value === "a" || value === "b" || value === "c"; }', 'file.js'),
		'"a" !== value && value !== "b" && "c" !== value;',
		'object.foo !== "a" && object["foo"] !== "b" && object.foo !== "c";',
		'(value !== "a") && ((value !== "b") && (value !== "c"));',
		'(value !== "a" && value !== "b" && value !== "c") || otherValue;',
		'value !== null && value !== undefined && value !== "a";',
		'value !== "a" /* comment */ && value !== "b" && value !== "c";',
		{
			code: 'value !== "a" && value !== "b";',
			options: [{minimumComparisons: 2}],
		},
		{
			code: 'value! !== "a" && value! !== "b" && value! !== "c";',
			languageOptions: {parser: parsers.typescript},
		},
		...[
			['==', '||'],
			['!=', '&&'],
		].flatMap(([comparisonOperator, logicalOperator]) => [
			typeAware(`declare const value: string; "a" ${comparisonOperator} value ${logicalOperator} value ${comparisonOperator} "b" ${logicalOperator} "c" ${comparisonOperator} value;`),
			typeAware(outdent`
				declare const object: {value: number};
				object.value ${comparisonOperator} 1 ${logicalOperator} object.value ${comparisonOperator} 2 ${logicalOperator} object.value ${comparisonOperator} 3;
			`),
		]),
		typeAware('declare const value: string; value !== "a" && value != "b" && value !== "c";'),
		typeAware('declare const value: string; declare const other: "a" | "b"; value == other || value == "c" || value == "d";'),
		typeAware('declare const value: string | number; if (typeof value === "string") { value == "a" || value == "b" || value == "c"; }'),
		typeAware('/** @param {string} value */ function check(value) { return value == "a" || value == "b" || value == "c"; }', 'file.js'),
		{
			...typeAware('declare const value: number; value != 1 && value != 2;'),
			options: [{minimumComparisons: 2}],
		},
		...[
			'((value))',
			'value!',
			'(value as string)',
			'(<string>value)',
			'(value satisfies string)',
		].map(reference => typeAware(`declare const value: string; ${reference} != "a" && ${reference} != "b" && ${reference} != "c";`)),
		typeAware('declare const value: string; declare const other: unknown; value != (other as string) && value != "b" && value != "c";'),
		{
			code: 'const element = <div>{value !== "a" && value !== "b" && value !== "c"}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		typeAware('declare const value: number; declare const other: 1 | 2; value == other || value == 3 || value == 4;'),
		typeAware(outdent`
			declare const value: string;
			declare const other: \`prefix-\${string}\`;
			value == other || value == "a" || value == "b";
		`),
	],
});
