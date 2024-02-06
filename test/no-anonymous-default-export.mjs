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
		'notExports = class {}',
		'notModule.exports = class {}',
		'module.notExports = class {}',
		'module.exports.foo = class {}',
		'alert(exports = class {})',
		'foo = module.exports = class {}',
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
			code: 'export default class extends class {} {}',
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
			code: 'export default class {}',
			filename: '/path/to/foo.helper.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/foo.bar.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/foo.test.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/.foo.js',
		},
		{
			code: outdent`
				let Foo, Foo_, foo, foo_
				export default class {}
			`,
			filename: '/path/to/foo.js',
		},

		// `ClassExpression`
		{
			code: outdent`
				let Foo, Foo_, foo, foo_
				export default (class{})
			`,
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default (class extends class {} {})',
			filename: '/path/to/foo.js',
		},
		{
			code: outdent`
				let Exports, Exports_, exports, exports_
				exports = class {}
			`,
			filename: '/path/to/exports.js',
		},
		{
			code: 'module.exports = class {}',
			filename: '/path/to/module.js',
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

		// `FunctionExpression`
		{
			code: outdent`
				let Foo, Foo_, foo, foo_
				export default (async function * () {})
			`,
			filename: '/path/to/foo.js',
		},
		{
			code: outdent`
				let Exports, Exports_, exports, exports_
				exports = function() {}
			`,
			filename: '/path/to/exports.js',
		},
		{
			code: 'module.exports = function() {}',
			filename: '/path/to/module.js',
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
				() => {}
			`,
			filename: '/path/to/foo.js',
		},
		{
			code: outdent`
				let Foo, Foo_, foo, foo_
				export default async () => {}
			`,
			filename: '/path/to/foo.js',
		},
		{
			code: outdent`
				let Exports, Exports_, exports, exports_
				exports = (( () => {} ))
			`,
			filename: '/path/to/exports.js',
		},
		{
			code: outdent`
				// comment 1
				module
				// comment 2
				.exports
				// comment 3
				=
				// comment 4
				() => {}
			`,
			filename: '/path/to/module.js',
		},
		{
			code: '(( exports = (( () => {} )) ))',
			filename: '/path/to/foo.js',
		},
		{
			code: '(( module.exports = (( () => {} )) ))',
			filename: '/path/to/foo.js',
		},
	],
});

// Decorators
const decoratorsBeforeExportOptions = {
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
};
const decoratorsAfterExportOptions = {
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
};
test.snapshot({
	valid: [],
	invalid: [
		{
			code: '@decorator export default class {}',
			filename: '/path/to/foo.js',
			...decoratorsBeforeExportOptions,
		},
		{
			code: 'export default @decorator(class {}) class extends class {} {}',
			filename: '/path/to/foo.js',
			...decoratorsAfterExportOptions,
		},
		{
			code: 'module.exports = @decorator(class {}) class extends class {} {}',
			filename: '/path/to/foo.js',
			...decoratorsAfterExportOptions,
		},
		{
			code: '@decorator @decorator(class {}) export default class {}',
			filename: '/path/to/foo.js',
			...decoratorsBeforeExportOptions,
		},
	],
});

