import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'export default function named() {}',
		'export default class named {}',
		'export default []',
		'export default {}',
		'export default 1',
		'export default false',
		'export default 0n',
		// `ClassExpression`s and `FunctionExpression`s are ignored
		'export default (class {})',
		'export default (function () {})',
	],
	invalid: [
		'export default function () {}',
		'export default class {}',
		'export default () => {}',
		'export default function * () {}',
		'export default async function () {}',
		'export default async function * () {}',
		'export default async () => {}',

		// `ClassDeclaration`
		{
			code: 'export default class {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default class{}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/foo-bar.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/foo_bar.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/foo+bar.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/foo+bar123.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/foo*.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/[foo].js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/class.js',
		},
		{
			code: outdent`
				let Foo, Foo_, foo, foo_
				export default class {}
			`,
			filename: '/path/to/foo.js',
		},


		// `FunctionDeclaration`
		{
			code: 'export default function () {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default function* () {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default async function* () {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default async function*() {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default async function *() {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default async function   *   () {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default async function * /* comment */ () {}',
			filename: '/path/to/foo.js',
		},
		{
			code: outdent`
				export default async function * // comment
				() {}
			`,
			filename: '/path/to/foo.js',
		},
		{
			code: outdent`
				let Foo, Foo_, foo, foo_
				export default async function * () {}
			`,
			filename: '/path/to/foo.js',
		},

		// `ArrowFunctionExpression`
		{
			code: 'export default () => {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default async () => {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default () => {};',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default() => {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default foo => {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default (( () => {} ))',
			filename: '/path/to/foo.js',
		},
		{
			code: '/* comment 1 */ export /* comment 2 */ default /* comment 3 */  () => {}',
			filename: '/path/to/foo.js',
		},
		{
			code: outdent`
				// comment 1
				export
				// comment 2
				default
				// comment 3
				() => {}`,
			filename: '/path/to/foo.js',
		},
		{
			code: outdent`
				let Foo, Foo_, foo, foo_
				export default async () => {}
			`,
			filename: '/path/to/foo.js',
		},
	],
});

// Decorators
test.snapshot({
	testerOptions: {
		parser: parsers.babel,
		parserOptions: {
			babelOptions: {
				parserOpts: {
					plugins: [
						['decorators', {decoratorsBeforeExport: true}],
					],
				},
			},
		},
	},
	valid: [],
	invalid: [
		{
			code: '@decorator export default class {}',
			filename: '/path/to/foo.js',
		},
		{
			code: '@decorator @decorator(class {}) export default class {}',
			filename: '/path/to/foo.js',
		},
	],
})

// Decorators
test.snapshot({
	testerOptions: {
		parser: parsers.babel,
		parserOptions: {
			babelOptions: {
				parserOpts: {
					plugins: [
						['decorators', {decoratorsBeforeExport: false}],
					],
				},
			},
		},
	},
	valid: [],
	invalid: [
		{
			code: 'export default @decorator(class {}) class {}',
			filename: '/path/to/foo.js',
		},
	]
});
