import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

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
	],
});
