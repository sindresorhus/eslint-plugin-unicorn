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
	],
	invalid: [
		'node.innerText;',
		'node.innerText = \'foo\';',
		'innerText.innerText;',
	],
});
