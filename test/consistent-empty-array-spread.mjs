import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'[,,,]',
		'[...(test ? [] : [a, b])]',
		'[...(test ? [a, b] : [])]',
		'[...(test ? "" : "ab")]',
		'[...(test ? "ab" : "")]',
		'[...(test ? "" : unknown)]',
		'[...(test ? unknown : "")]',
		'[...(test ? [] : unknown)]',
		'[...(test ? unknown : [])]',
		'_ = {...(test ? "" : [a, b])}',
		'_ = {...(test ? [] : "ab")}',
		'call(...(test ? "" : [a, b]))',
		'call(...(test ? [] : "ab"))',
		'[...(test ? "ab" : [a, b])]',
		// Not checking
		'const EMPTY_STRING = ""; [...(test ? EMPTY_STRING : [a, b])]',
	],
	invalid: [
		outdent`
			[
				...(test ? [] : "ab"),
				...(test ? "ab" : []),
			];
		`,
		outdent`
			const STRING = "ab";
			[
				...(test ? [] : STRING),
				...(test ? STRING : []),
			];
		`,
		outdent`
			[
				...(test ? "" : [a, b]),
				...(test ? [a, b] : ""),
			];
		`,
		outdent`
			const ARRAY = ["a", "b"];
			[
				/* hole */,
				...(test ? "" : ARRAY),
				/* hole */,
				...(test ? ARRAY : ""),
				/* hole */,
			];
		`,
		'[...(foo ? "" : [])]',
	],
});
