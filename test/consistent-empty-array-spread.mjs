import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'[,,,]',
		'[...(test ? [] : [a, b])]',
		'[...(test ? [a, b] : [])]',
		'[...(test ? "" : "ab")]',
		'[...(test ? "ab" : [])]',
		'[...(test ? "" : unknown)]',
		'[...(test ? unknown : "")]',
		'[...(test ? [] : unknown)]',
		'[...(test ? unknown : [])]',
		'_ = {...(test ? "" : [a, b])}',
		'_ = {...(test ? [] : "ab")}',
		'call(...(test ? "" : [a, b]))',
		'call(...(test ? [] : "ab"))',
		// Not checking
		'const EMPTY_STRING; [...(test ? EMPTY_STRING : [a, b])]',
	],
	invalid: [
		'[...(test ? [] : "ab")]',
		'[...(test ? "ab" : [])]',
		'const STRING = "ab"; [...(test ? [] : STRING)]',
		'const STRING = "ab"; [...(test ? STRING : [])]',
		'[...(test ? "" : [a, n])]',
		'[...(test ? [a, n] : [])]',
		'const ARRAY = ["a", "b"]; [...(test ? [] : ARRAY)]',
		'const ARRAY = ["a", "b"]; [...(test ? ARRAY : [])]',
	],
});
