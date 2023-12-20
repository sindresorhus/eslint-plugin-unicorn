import {getTester} from './utils/test.mjs';

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
