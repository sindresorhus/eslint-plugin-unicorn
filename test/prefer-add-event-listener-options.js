import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'window.addEventListener("click", listener)',
		'window.addEventListener("click", listener, {capture: true})',
		'window.addEventListener("click", listener, {capture: false})',
		'window.addEventListener("click", listener, {passive: true})',
		'window.addEventListener("click", listener, {once: true})',
		'window.addEventListener("click", listener, {signal})',
		'window.addEventListener("click", listener, options)',
		'window.addEventListener("click", listener, capture)',
		'window.addEventListener("click", listener, Boolean(value))',
		'window.addEventListener("click", listener, condition ? true : false)',
		'window["addEventListener"]("click", listener, true)',
		'window?.addEventListener("click", listener, true)',
		'window.addEventListener?.("click", listener, true)',
		'window.addEventListener("click", ...arguments_, true)',
	],
	invalid: [
		'window.addEventListener("click", listener, true)',
		'window.addEventListener("click", listener, false)',
		'window.addEventListener("click", () => {}, true)',
		'window.addEventListener("click", function () {}, false)',
		'document.body.addEventListener("click", listener, true)',
		'(window).addEventListener("click", listener, false)',
		'window.addEventListener("click", listener, /* useCapture */ true)',
		'window.addEventListener("click", listener, true /* useCapture */)',
		outdent`
			window.addEventListener(
				"click",
				listener,
				true
			)
		`,
	],
});
