import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const noAutofixOutput = /./.exec('');

test.typescript({
	valid: [
		'type ElementUnion = Other | {foo: string};',
		'type ElementIntersection = Other & {foo: string};',
		'type ElementUnion = A | B | {foo: string} | {bar: string};',
		'type ElementUnion = {foo: string} | {bar: string};',
		'type ElementUnion = Promise<{foo: string}> | Other;',
		outdent`
			type ElementUnion = Other | {
				foo: string;
			};
		`,
		// `null`/`undefined` are kept at the end as a nullish escape hatch.
		'type ElementUnion = {foo: string} | undefined;',
		'type ElementUnion = {foo: string} | null;',
		'type ElementUnion = string | {foo: string} | undefined;',
		'type ElementUnion = {foo: string} | null | undefined;',
		'type ElementUnion = {foo: string} | {bar: string} | undefined;',
		// The rule does not force nullish last, so a leading nullish is left alone when the literal is already last.
		'type ElementUnion = undefined | {foo: string};',
		outdent`
			type ElementUnion = {
				foo: string;
			} | undefined;
		`,
	],
	invalid: [
		{
			code: 'type ElementUnion = {foo: string} | Other;',
			output: 'type ElementUnion = Other | {foo: string};',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementIntersection = {foo: string} & Other;',
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = A | {foo: string} | B;',
			output: 'type ElementUnion = A | B | {foo: string};',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | A | {bar: string} | B;',
			output: 'type ElementUnion = A | B | {foo: string} | {bar: string};',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | string;',
			output: 'type ElementUnion = string | {foo: string};',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | Other | undefined;',
			output: 'type ElementUnion = Other | {foo: string} | undefined;',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | undefined | Other;',
			output: 'type ElementUnion = Other | {foo: string} | undefined;',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = undefined | {foo: string} | Other;',
			output: 'type ElementUnion = Other | {foo: string} | undefined;',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = ({foo: string}) | Other;',
			output: 'type ElementUnion = Other | ({foo: string});',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | (() => string);',
			output: 'type ElementUnion = (() => string) | {foo: string};',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | (new () => Element);',
			output: 'type ElementUnion = (new () => Element) | {foo: string};',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | (A extends B ? C : D);',
			output: 'type ElementUnion = (A extends B ? C : D) | {foo: string};',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | ({bar: string} | Other);',
			output: 'type ElementUnion = ({bar: string} | Other) | {foo: string};',
			errors: [
				{messageId: 'prefer-type-literal-last'},
				{messageId: 'prefer-type-literal-last'},
			],
		},
		{
			code: 'type ElementIntersection = {foo: string} & (A | B);',
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementIntersection = {(value: 1): 1} & ((value: 1) => 2);',
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementIntersection = {new (): Element} & (new () => Other);',
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: outdent`
				type ElementUnion = {
					/* description */
					foo: string;
				} | Other;
			`,
			output: outdent`
				type ElementUnion = Other | {
					/* description */
					foo: string;
				};
			`,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} /* comment */ | Other;',
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: outdent`
				type ElementUnion = {foo: string} |
					// comment
					Other;
			`,
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = /* comment */ {foo: string} | Other;',
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | (/* comment */ Other);',
			output: 'type ElementUnion = (/* comment */ Other) | {foo: string};',
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | Other /* comment */;',
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
		{
			code: 'type ElementUnion = {foo: string} | Other /* comment */',
			output: noAutofixOutput,
			errors: [{messageId: 'prefer-type-literal-last'}],
		},
	],
});
