import {getTester} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test} = getTester(import.meta);

const checkAllSelectorsOptions = [{checkAllSelectors: true}];

test.snapshot({
	valid: [
		// Not `CallExpression`
		'new document.querySelector(`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		// Not `MemberExpression`
		'querySelector(`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		// `callee.property` is not an `Identifier`
		'document["querySelector"](`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		// Computed
		'document[querySelector](`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		// Not listed method
		'document.find(`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		// More or less argument(s)
		'document.querySelector();',
		'document.querySelector(...[`[data-id="${id}"]`]);', // eslint-disable-line no-template-curly-in-string

		// `callee.object` is not a DOM Node
		...notDomNodeTypes.map(data => `(${data}).querySelector(\`[data-id="\${id}"]\`)`),

		'document.querySelector("#foo");',
		'document.querySelector(`[data-id="foo"]`);',
		'document.querySelector(`[data-id="${CSS.escape(id)}"]`);', // eslint-disable-line no-template-curly-in-string
		'const CSS = localCss; document.querySelector(`[data-id="${CSS.escape(id)}"]`);', // eslint-disable-line no-template-curly-in-string
		'element.querySelectorAll(`a[href^="#${CSS.escape(hash)}"]`);', // eslint-disable-line no-template-curly-in-string
		'element.matches(`[data-id="${CSS.escape(id)}"]`);', // eslint-disable-line no-template-curly-in-string
		'element.closest(`[data-id="${CSS.escape(id)}"]`);', // eslint-disable-line no-template-curly-in-string
		'document.querySelector(cssEscape`#${id}`);', // eslint-disable-line no-template-curly-in-string

		// Default option only checks attribute selectors
		'document.querySelector(`#${id}`);', // eslint-disable-line no-template-curly-in-string
		'document.querySelectorAll(`.${className}`);', // eslint-disable-line no-template-curly-in-string
		'element.matches(`section > .${className}`);', // eslint-disable-line no-template-curly-in-string
	],
	invalid: [
		'document.querySelector(`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		'element.querySelectorAll(`a[href^="#${hash}"]`);', // eslint-disable-line no-template-curly-in-string
		'element.matches(`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		'element.closest(`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		'document?.querySelector(`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		'document.querySelector?.(`[data-id="${id}"]`);', // eslint-disable-line no-template-curly-in-string
		'document.querySelector(`[data-id="${id}"]`, root);', // eslint-disable-line no-template-curly-in-string
		'document.querySelector(`[data-id="${id}"][data-name="${name}"]`);', // eslint-disable-line no-template-curly-in-string
		'document.querySelector(`[data-id="${String(id)}"]`);', // eslint-disable-line no-template-curly-in-string
		'document.querySelector(`[data-id="${/* keep */ id}"]`);', // eslint-disable-line no-template-curly-in-string
		'document.querySelector(`[data-id="${foo, bar}"]`);', // eslint-disable-line no-template-curly-in-string
		'document.querySelector(`[data-id="${id}"] .${className}`);', // eslint-disable-line no-template-curly-in-string

		{
			code: 'document.querySelector(`#${id}`);', // eslint-disable-line no-template-curly-in-string
			options: checkAllSelectorsOptions,
		},
		{
			code: 'document.querySelectorAll(`.${className}`);', // eslint-disable-line no-template-curly-in-string
			options: checkAllSelectorsOptions,
		},
		{
			code: 'document.querySelector(`#${id}[data-value="${value}"] .${className}`);', // eslint-disable-line no-template-curly-in-string
			options: checkAllSelectorsOptions,
		},
	],
});
