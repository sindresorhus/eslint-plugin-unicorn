import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'new Set(foo).size',
		'for (const foo of bar) console.log([...foo].length)',
		'[...new Set(array), foo].length',
		'[foo, ...new Set(array), ].length',
		'[...new Set(array)].notLength',
		'[...new Set(array)]?.length',
		'[...new Set(array)][length]',
		'[...new Set(array)]["length"]',
		'[...new NotSet(array)].length',
		'[...Set(array)].length',
		'const foo = new NotSet([]);[...foo].length;',
		'let foo = new Set([]);[...foo].length;',
		'const {foo} = new Set([]);[...foo].length;',
		'const [foo] = new Set([]);[...foo].length;',
		'[...foo].length',
		'var foo = new Set(); var foo = new Set(); [...foo].length',
		'[,].length',
		// `Array.from` — valid cases
		'Array.from(foo).length',
		'Array.from(new NotSet(array)).length',
		'Array.from(Set(array)).length',
		'Array.from(new Set(array)).notLength',
		'Array.from(new Set(array))?.length',
		'Array.from(new Set(array))[length]',
		'Array.from(new Set(array))["length"]',
		'Array.from(new Set(array), mapFn).length',
		'Array?.from(new Set(array)).length',
		'Array.from?.(new Set(array)).length',
		'const foo = new NotSet([]);Array.from(foo).length;',
		'let foo = new Set([]);Array.from(foo).length;',
		'const {foo} = new Set([]);Array.from(foo).length;',
		'const [foo] = new Set([]);Array.from(foo).length;',
		'var foo = new Set(); var foo = new Set(); Array.from(foo).length',
		'NotArray.from(new Set(array)).length',
	],
	invalid: [
		'[...new Set(array)].length',
		outdent`
			const foo = new Set([]);
			console.log([...foo].length);
		`,
		outdent`
			function isUnique(array) {
				return[...new Set(array)].length === array.length
			}
		`,
		'[...new Set(array),].length',
		'[...(( new Set(array) ))].length',
		'(( [...new Set(array)] )).length',
		outdent`
			foo
			;[...new Set(array)].length
		`,
		'[/* comment */...new Set(array)].length',
		'[...new /* comment */ Set(array)].length',
		// `Array.from` — invalid cases
		'Array.from(new Set(array)).length',
		outdent`
			const foo = new Set([]);
			console.log(Array.from(foo).length);
		`,
		'Array.from((( new Set(array) ))).length',
		'(( Array.from(new Set(array)) )).length',
		'Array.from(/* comment */ new Set(array)).length',
		'Array.from(new /* comment */ Set(array)).length',
		outdent`
			function isUnique(array) {
				return Array.from(new Set(array)).length === array.length
			}
		`,
	],
});
