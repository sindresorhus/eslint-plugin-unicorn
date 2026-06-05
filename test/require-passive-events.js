import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'window.addEventListener("click", () => {})',
		'window.addEventListener("scroll", () => {})',
		'window.addEventListener("keydown", () => {})',
		'window.addEventListener("pointermove", () => {})',
		'window.addEventListener(eventName, () => {})',
		'window.addEventListener("wheel", handler)',
		'window.addEventListener("wheel", object.handleEvent)',
		'window.addEventListener("wheel")',
		'window.addEventListener("wheel", () => {}, options)',
		'window.addEventListener("wheel", () => {}, {...options})',
		'window.addEventListener("wheel", () => {}, {passive: true})',
		'window.addEventListener("wheel", () => {}, {"passive": true})',
		'window.addEventListener("wheel", () => {}, {[passive]: true})',
		'window.addEventListener("wheel", () => {}, {passive})',
		'window.addEventListener("wheel", event => { event.preventDefault(); })',
		'window.addEventListener("wheel", event => event.preventDefault())',
		'window.addEventListener("wheel", event => { event["preventDefault"](); })',
		'window.addEventListener("wheel", event => { handleEvent(event); })',
		'window.addEventListener("wheel", event => { return event; })',
		'window.addEventListener("wheel", event => { const anotherEvent = event; })',
		'window.addEventListener("wheel", event => { event[method](); })',
		'window.addEventListener("wheel", event => { event.returnValue = false; })',
		'window.addEventListener("wheel", event => { ({returnValue: event.returnValue} = {returnValue: false}); })',
		'window.addEventListener("wheel", function () { arguments[0].preventDefault(); })',
		'window.addEventListener("wheel", function () { const nested = () => arguments[0].preventDefault(); nested(); })',
		'window.addEventListener("wheel", ({target}) => { console.log(target); })',
		'window?.addEventListener("wheel", () => {})',
		'window.addEventListener?.("wheel", () => {})',
	],
	invalid: [
		'window.addEventListener("wheel", () => {})',
		'window.addEventListener("mousewheel", () => {})',
		'window.addEventListener("touchstart", () => {})',
		'window.addEventListener("touchmove", () => {})',
		'window.addEventListener("touchenter", () => {})',
		'window.addEventListener("touchend", () => {})',
		'window.addEventListener("touchleave", () => {})',
		'window.addEventListener("wheel", function () {})',
		'window.addEventListener("wheel", event => { console.log(event.target); })',
		'window.addEventListener("wheel", event => { console.log(event.currentTarget.dataset.value); })',
		outdent`
			window.addEventListener("wheel", function (event) {
				function nested() {
					arguments[0].preventDefault();
				}

				console.log(event.target);
			})
		`,
		'window.addEventListener("wheel", () => {}, true)',
		'window.addEventListener("wheel", () => {}, false)',
		'window.addEventListener("wheel", () => {}, {})',
		'window.addEventListener("wheel", () => {}, {once: true})',
		'window.addEventListener("wheel", () => {}, {capture: true})',
		'window.addEventListener("wheel", () => {}, {passive: false})',
		'window.addEventListener("wheel", () => {}, {"passive": false})',
		outdent`
			window.addEventListener("wheel", () => {}, {
				once: true,
			})
		`,
		outdent`
			window.addEventListener("wheel", () => {}, {
				once: true // Keep this comment with once.
			})
		`,
	],
});
