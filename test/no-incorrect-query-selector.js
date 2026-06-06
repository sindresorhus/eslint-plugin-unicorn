import outdent from 'outdent';
import {getTester} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Not `CallExpression`
		'new document.querySelectorAll("form");',
		// Not `MemberExpression`
		'querySelectorAll("form")[0];',
		// `callee.property` is not an `Identifier`
		'document["querySelectorAll"]("form")[0];',
		// Computed
		'document[querySelectorAll]("form")[0];',
		// Not listed method
		'document.querySelector("form");',
		// More or less argument(s)
		'document.querySelectorAll();',
		'document.querySelectorAll("form", root);',
		'document.querySelectorAll(...["form"]);',

		// `callee.object` is not a DOM Node
		...notDomNodeTypes.map(data => `(${data}).querySelectorAll("form")[0]`),

		'document.querySelectorAll("form");',
		'document.querySelectorAll("form")[1];',
		'document.querySelectorAll("form")[index];',
		'document.querySelectorAll("form").at(1);',
		'document.querySelectorAll("form").at(index);',
		'document.querySelectorAll("form").item(1);',
		'document.querySelectorAll("form").item(index);',
		'document.querySelectorAll("form")?.[0];',
		'document.querySelectorAll("form")?.at(0);',
		'document.querySelectorAll("form").at?.(0);',
		'document.querySelectorAll("form")?.item(0);',
		'document.querySelectorAll("form").item?.(0);',
		'document.querySelectorAll("form")[0] = form;',
		'document.querySelectorAll("form")[0]++;',
		'delete document.querySelectorAll("form")[0];',
		'delete document.querySelectorAll("form").at(0);',
		'delete document.querySelectorAll("form").item(0);',
		'for (document.querySelectorAll("form")[0] in object) {}',
		'for (document.querySelectorAll("form")[0] of iterable) {}',
		'document.querySelectorAll("form") /* keep */ [0];',
		'document.querySelectorAll("form").at(/* keep */ 0);',
		'document.querySelectorAll("form").item(/* keep */ 0);',
		'document.querySelectorAll("#foo .bar");',
		'document.querySelectorAll("#foo, #bar");',
		'document.querySelectorAll("#foo:checked");',
		'document.querySelectorAll("#foo bar");',
		'document.querySelectorAll("#1");',
		'document.querySelectorAll(`#${foo}`);', // eslint-disable-line no-template-curly-in-string
		'const elements = document.querySelectorAll(".item"); if (elements.length > 0) {}',
		'const elements = document.querySelectorAll(".item"); if (elements.length) {}',
		'let elements = document.querySelectorAll(".item"); if (elements) {}',
		'const elements = document.querySelectorAll(".item"); const alias = elements; if (alias) {}',
		'function foo(elements) { if (elements) {} }',
		'const Boolean = value => value; if (Boolean(document.querySelectorAll(".item"))) {}',
		'const Boolean = value => value; if (!Boolean(document.querySelectorAll(".item"))) {}',
		outdent`
			const Boolean = value => value;
			const elements = document.querySelectorAll(".item");
			if (Boolean(elements)) {}
		`,
	],
	invalid: [
		'document.querySelectorAll("form")[0].addEventListener("submit", submitFunction);',
		'document.querySelectorAll("form").at(0).addEventListener("submit", submitFunction);',
		'document.querySelectorAll("form").item(0).addEventListener("submit", submitFunction);',
		'document.querySelectorAll("#foo").at(0);',
		'(document.querySelectorAll("form"))[0];',
		'(document.querySelectorAll("form")).at(0);',
		'document.querySelectorAll("#foo");',
		'document.querySelectorAll(`#foo`);',
		'if (document.querySelectorAll(".item")) {}',
		'if (!document.querySelectorAll(".item")) {}',
		'while (document.querySelectorAll(".item")) {}',
		'const hasItems = document.querySelectorAll(".item") ? true : false;',
		'if (document.querySelectorAll(".item") && ready) {}',
		outdent`
			const elements = document.querySelectorAll(".item");
			if (elements && ready) {}
		`,
		'if (Boolean(document.querySelectorAll(".item"))) {}',
		'if (!Boolean(document.querySelectorAll(".item"))) {}',
		outdent`
			const elements = document.querySelectorAll(".item");
			if (elements) {}
		`,
		outdent`
			const elements = document.querySelectorAll(".item");
			if (!elements) {}
		`,
		'if (Boolean(/* keep */ document.querySelectorAll(".item"))) {}',
		'if (!/* keep */ document.querySelectorAll(".item")) {}',
	],
});
