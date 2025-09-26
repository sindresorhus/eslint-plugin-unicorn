import {getTester} from './utils/test.js';

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
		'String.fromCharCode( code )',
		'(( (( String )).fromCharCode( ((code)), ) ))',
		'String.fromCharCode.bind(String)',
		'const x = String.fromCharCode',
	],
});
