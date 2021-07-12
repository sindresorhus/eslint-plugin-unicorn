import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test({
	valid: [
		'const foo = i > 5 ? true : false;',
		'const foo = i > 5 ? true : (i < 100 ? true : false);',
		'const foo = i > 5 ? (i < 100 ? true : false) : true;',
		'const foo = i > 5 ? (i < 100 ? true : false) : (i < 100 ? true : false);',
		'const foo = i > 5 ? true : (i < 100 ? FOO(i > 50 ? false : true) : false);',
		'foo ? doBar() : doBaz();',
		'var foo = bar === baz ? qux : quxx;',
	],
	invalid: [
		{
			code: 'const foo = i > 5 ? true : (i < 100 ? true : (i < 1000 ? true : false));',
			errors: 1,
		},
		{
			code: 'const foo = i > 5 ? true : (i < 100 ? (i > 50 ? false : true) : false);',
			errors: 1,
		},
		{
			code: 'const foo = i > 5 ? i < 100 ? true : false : true;',
			output: 'const foo = i > 5 ? (i < 100 ? true : false) : true;',
			errors: 1,
		},
		{
			code: 'const foo = i > 5 ? i < 100 ? true : false : i < 100 ? true : false;',
			output: 'const foo = i > 5 ? (i < 100 ? true : false) : (i < 100 ? true : false);',
			errors: 2,
		},
		{
			code: 'const foo = i > 5 ? true : i < 100 ? true : false;',
			output: 'const foo = i > 5 ? true : (i < 100 ? true : false);',
			errors: 1,
		},
		{
			code: 'foo ? bar : baz === qux ? quxx : foobar;',
			output: 'foo ? bar : (baz === qux ? quxx : foobar);',
			errors: 1,
		},
		{
			code: 'foo ? baz === qux ? quxx : foobar : bar;',
			output: 'foo ? (baz === qux ? quxx : foobar) : bar;',
			errors: 1,
		},
	],
});

test.typescript({
	valid: [
		// #663
		outdent`
			const pluginName = isAbsolute ?
				pluginPath.slice(pluginPath.lastIndexOf('/') + 1) :
				(
					isNamespaced ?
					pluginPath.split('@')[1].split('/')[1] :
					pluginPath
				);
		`,
	],
	invalid: [],
});

test.snapshot({
	valid: [],
	invalid: [
		'const foo = i > 5 ? i < 100 ? true : false : i < 100 ? true : false;',
		'const foo = i > 5 ? true : (i < 100 ? true : (i < 1000 ? true : false));',
		outdent`
			const foo = a ?
				b :
				(
					c ?
						d :
						(
							e ?
								f :
								(g ? h : i)
						)
				)
		`,
	],
});
