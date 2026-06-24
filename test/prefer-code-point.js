import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'"🦄".codePointAt(0)',
		'foo.charCodeAt',
		'new foo.charCodeAt',
		'charCodeAt(0)',
		'foo.charCodeAt?.(0)',
		'foo[charCodeAt](0)',
		'foo["charCodeAt"](0)',
		'foo.notCharCodeAt(0)',

		'String.fromCodePoint(0x1f984)',
		'String.fromCodePoint',
		'new String.fromCodePoint',
		'fromCodePoint(foo)',
		'String.fromCodePoint?.(foo)',
		'String?.fromCodePoint(foo)',
		'window.String.fromCodePoint(foo)',
		'String[fromCodePoint](foo)',
		'String["fromCodePoint"](foo)',
		'String.notFromCodePoint(foo)',
		'NotString.fromCodePoint(foo)',
	],
	invalid: [
		'string.charCodeAt(index)',
		'string?.charCodeAt(index)',
		'(( (( string )).charCodeAt( ((index)), )))',
		// Result used as a number: reported, but no suggestion offered
		'hash = (((hash * 31) | 0) + string.charCodeAt(offset)) | 0',
		'string.charCodeAt(index) + 1',
		'string.charCodeAt(index) * 31',
		'string.charCodeAt(index) - 48',
		'(string.charCodeAt(index) | 0)',
		'string.charCodeAt(index) ^ hash',
		'(hash << 5) - hash + string.charCodeAt(index)',
		'sum += string.charCodeAt(index)',
		'sum += condition ? string.charCodeAt(index) : 0',
		'sum += string.charCodeAt(index) || 0',
		'string?.charCodeAt(index) + 1',
		'~string.charCodeAt(index)',
		'-string.charCodeAt(index)',
		// Result not used as a number: suggestion retained
		'string.charCodeAt(index).toString(16)',
		'string.charCodeAt(index) > 127',
		'foo(string.charCodeAt(index))',
		'const x = string.charCodeAt(index)',
		'string.charCodeAt(index) === 65',
		'string.charCodeAt(index) || 0',
		'!string.charCodeAt(index)',
		'String.fromCharCode( code )',
		'(( (( String )).fromCharCode( ((code)), ) ))',
		'String.fromCharCode.bind(String)',
		'const x = String.fromCharCode',
		// Multiple arguments
		'String.fromCharCode(65, 66, 67)',
		// TypeScript wrappers on the receiver
		{code: 'foo!.charCodeAt(0)', languageOptions: {parser: parsers.typescript}},
		{code: '(str as string).charCodeAt(0)', languageOptions: {parser: parsers.typescript}},
	],
});
