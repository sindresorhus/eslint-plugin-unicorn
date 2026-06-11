import {getTester} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Not `CallExpression`
		'new element.querySelector(".outer .inner");',
		// Not `MemberExpression`
		'querySelector(".outer .inner");',
		// `callee.property` is not an `Identifier`
		'element["querySelector"](".outer .inner");',
		// Computed
		'element[querySelector](".outer .inner");',
		// Not listed method
		'element.matches(".outer .inner");',
		// More or less argument(s)
		'element.querySelector();',
		'element.querySelector(".outer .inner", root);',
		'element.querySelector(...[".outer .inner"]);',

		// `callee.object` is not a DOM Node
		...notDomNodeTypes.map(data => `(${data}).querySelector(".outer .inner")`),

		'document.querySelector(".outer .inner");',
		'document.querySelectorAll(".outer .inner");',
		'window.document.querySelector(".outer .inner");',
		'globalThis.document.querySelectorAll(".outer .inner");',
		'element.querySelector(":scope .outer .inner");',
		'element.querySelectorAll(":scope .outer .inner");',
		'element.querySelector(".outer :scope .inner");',
		'element.querySelector("[data-value=\':scope\'] .inner");',
		'element.querySelector("");',
		'element.querySelector("   ");',
		'element.querySelector(selector);',
		'element.querySelector(".outer " + selector);',
		'element.querySelector(`.${className}`);', // eslint-disable-line no-template-curly-in-string
		'element.querySelector(String.raw`.outer .inner`);',
	],
	invalid: [
		'element.querySelector(".outer .inner");',
		'element.querySelectorAll(".outer .inner");',
		'element.querySelector(".a");',
		'document.body.querySelectorAll("option");',
		'element.querySelector(`.outer .inner`);',
		'element.querySelectorAll(`option`);',
		'element?.querySelector(".outer .inner");',
		'element.querySelector?.(".outer .inner");',
		'element.querySelectorAll(".foo, .bar");',
	],
});
