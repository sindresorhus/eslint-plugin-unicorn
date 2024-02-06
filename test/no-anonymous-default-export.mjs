import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

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
			code: outdent`
				let Foo, Foo_, foo, foo_
				export default class {}
			`,
			filename: '/path/to/foo.js',
		},


		{
			code: 'export default function () {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default () => {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default function () {}',
			filename: '123.js',
		},
		{
			code: 'export default function () {}',
			filename: '$foo.js',
		},
		{
			code: 'export default function () {}',
			filename: '_foo.js',
		},
		{
			code: 'export default class {}',
			filename: '/path/to/foo.js',
		},
		{
			code: 'export default function () {}',
			filename: '/path/to/foo.test.js',
		},
	],
});
