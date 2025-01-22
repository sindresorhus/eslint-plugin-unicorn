import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'blob.arrayBuffer()',
		'blob.text()',
		'new Response(blob).arrayBuffer()',
		'new Response(blob).text()',
		'fileReader.readAsDataURL(blob)',
		'fileReader.readAsBinaryString(blob)',
		'fileReader.readAsText(blob, "ascii")',
	],
	invalid: [
		'fileReader.readAsArrayBuffer(blob)',
		'fileReader.readAsText(blob)',
	],
});
