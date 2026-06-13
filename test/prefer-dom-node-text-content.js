import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'innerText;',
		'node.textContent;',
		'node[innerText];',
		'innerText = true;',
		'node[\'innerText\'];',
		'innerText.textContent',
		'const [innerText] = node;',
		'[innerText] = node;',
		'const {[innerText]: text} = node;',
		'({[innerText]: text} = node);',
		'const foo = {innerText}',
		'const foo = {innerText: text}',
		{
			code: 'interface Value {innerText: string} declare const value: Value; value.innerText;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface Value {innerText: string} declare const value: Value; const {innerText} = value;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface Value {innerText: string} declare const value: Value; let innerText; ({innerText} = value);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface Value {innerText: string} function foo({innerText}: Value) { return innerText; }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'node.innerText;',
		'node?.innerText;',
		'node.innerText = \'foo\';',
		'innerText.innerText;',
		'const {innerText} = node;',
		'const {innerText,} = node;',
		'const {innerText: text} = node;',
		'const {innerText = "default text"} = node;',
		'const {innerText: text = "default text"} = node;',
		'({innerText} = node);',
		'({innerText: text} = node);',
		'({innerText = "default text"} = node);',
		'({innerText: text = "default text"} = node);',
		'function foo({innerText}) {return innerText}',
		'for (const [{innerText}] of elements);',
	],
});
