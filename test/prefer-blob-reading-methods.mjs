import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'blob.arrayBuffer()',
		'blob.text()',
		'new Response(blob).arrayBuffer()',
		'new Response(blob).text()',
		'new FileReader().readAsDataURL(blob)',
		'new FileReader().readAsBinaryString(blob)',
		'new FileReader().readAsText(blob, "ascii")',
	],
	invalid: [
		'new FileReader().readAsArrayBuffer(blob)',
		'new FileReader().readAsText(blob)',
	],
});
