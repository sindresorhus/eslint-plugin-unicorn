import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'window.removeEventListener(handler)',
		outdent`
			class MyComponent {
				handler() {}
				disconnectedCallback() {
					this.removeEventListener('click', this.handler);
				}
			}
		`,
		'this.removeEventListener("click", getListener())',
		'el.removeEventListener("scroll", handler)',
		'el.removeEventListener("keydown", obj.listener)',
		'removeEventListener("keyup", () => {})',
		'removeEventListener("keydown", function () {})',
		'window.removeEventListener("click", handler[bind]())'
	],
	invalid: [
		'window.removeEventListener("scroll", handler.bind(abc))',
		'window.removeEventListener("scroll", this.handler.bind(abc))',
		'window.removeEventListener("click", () => {})',
		'window.removeEventListener("keydown", function () {})',
		'el.removeEventListener("click", (e) => { e.preventDefault(); })',
		'el.removeEventListener("mouseover", fn.bind(abc))',
		'el.removeEventListener("mouseout", function (e) {})'
	]
});
