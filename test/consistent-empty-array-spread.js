import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'[...(flag ? tag`` : [1])];',
		'[...(flag ? `${value}` : [1])];', // eslint-disable-line no-template-curly-in-string
		'[...(flag ? `` : `value`)];',
	],
	invalid: [
		['[...(flag ? `` : [1])];', '[...(flag ? [] : [1])];'],
		['[...(flag ? [1] : ``)];', '[...(flag ? [1] : [])];'],
		['[...(flag ? `\\\n` : [1])];', '[...(flag ? [] : [1])];'],
		['[...(flag ? /* keep */ `` : [1])];', '[...(flag ? /* keep */ [] : [1])];'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test.snapshot({
	valid: [
		'[,,,]',
		'[...(test ? [] : [a, b])]',
		'[...(test ? [a, b] : [])]',
		'[...(test ? "" : "ab")]',
		'[...(test ? "ab" : "")]',
		'const modes = new Set(["foo"]); modes.clear(); [...(modes.size ? [] : (modes.size ? "x" : []))]',
		'const modes = new Set(["foo"]); modes.clear(); [...(modes.size ? [] : ((modes.size && "x") || []))]',
		'const modes = new Set(["foo"]); modes.clear(); [...(modes.size ? (modes.size ? [] : "x") : [])]',
		'const object = {value: ""}; Object.defineProperty(object, "value", {get() { return []; }}); [...(object.value ? [] : object.value)]',
		'[...(test ? "" : unknown)]',
		'[...(test ? unknown : "")]',
		'[...(test ? [] : unknown)]',
		'[...(test ? unknown : [])]',
		'_ = {...(test ? "" : [a, b])}',
		'_ = {...(test ? [] : "ab")}',
		'call(...(test ? "" : [a, b]))',
		'call(...(test ? [] : "ab"))',
		'[...(test ? "ab" : [a, b])]',
		// Both branches are empty arrays
		'[...(test ? [] : [])]',
		// Nested ternary as a branch is not recursed into
		'[...(test ? (a ? "" : "x") : [a, b])]',
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

// Reported, but not fixed, a comment inside the empty array would be lost
test({
	valid: [],
	invalid: [
		{
			code: 'const a = [...(x ? [/* keep me */] : "abc")];',
			errors: 1,
		},
		{
			code: 'const a = [...(x ? [ // keep me\n] : "abc")];',
			errors: 1,
		},
		{
			code: 'const a = [...(x ? "abc" : [/* keep me */])];',
			errors: 1,
		},
	],
});
