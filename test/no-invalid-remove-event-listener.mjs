import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// CallExpression
		'new el.removeEventListener("click", () => {})',
		'el?.removeEventListener("click", () => {})',
		'el.removeEventListener?.("click", () => {})',
		'el.notRemoveEventListener("click", () => {})',
		'el[removeEventListener]("click", () => {})',

		// Arguments
		'el.removeEventListener("click")',
		'el.removeEventListener()',
		'el.removeEventListener(() => {})',
		'el.removeEventListener(...["click", () => {}], () => {})',
		'el.removeEventListener(() => {}, "click")',
		'window.removeEventListener("click", handler.notBind())',
		'window.removeEventListener("click", handler[bind]())',
		'window.removeEventListener("click", handler.bind?.())',
		'window.removeEventListener("click", handler?.bind())',

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
		'removeEventListener("keydown", function () {})'

	],
	invalid: [
		'window.removeEventListener("scroll", handler.bind(abc))',
		'window.removeEventListener("scroll", this.handler.bind(abc))',
		'window.removeEventListener("click", () => {})',
		'window.removeEventListener("keydown", function () {})',
		'el.removeEventListener("click", (e) => { e.preventDefault(); })',
		'el.removeEventListener("mouseover", fn.bind(abc))',
		'el.removeEventListener("mouseout", function (e) {})',
		'el.removeEventListener("mouseout", function (e) {}, true)',
		'el.removeEventListener("click", function (e) {}, ...moreArguments)',
		'el.removeEventListener(() => {}, () => {}, () => {})'
	]
});
