'use strict';

const {GlobalReferenceTracker} = require('./utils/global-reference-tracker.js');
const isShadowed = require('./utils/is-shadowed.js');

const MESSAGE_ID_ERROR = 'prefer-global-this/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `globalThis` over `{{value}}`.',
};

const globalIdentifier = new Set(['window', 'self', 'global']);

const windowSpecificEvents = new Set([
	'resize',
	'blur',
	'focus',
	'load',
	'scroll',
	'scrollend',
	'wheel',
	'beforeunload', // Browsers might have specific behaviors on exactly `window.onbeforeunload =`
	'message',
	'messageerror',
	'pagehide',
	'pagereveal',
	'pageshow',
	'pageswap',
	'unload',
]);

/**
Note: What kind of API should be a windows-specific interface?

1. It's directly related to window (✅ window.close())
2. It does NOT work well as globalThis.x or x (✅ window.frames, window.top)

Some constructors are occasionally related to window (like Element !== iframe.contentWindow.Element), but they don't need to mention window anyway.

Please use these criteria to decide whether an API should be added here. Context: https://github.com/sindresorhus/eslint-plugin-unicorn/pull/2410#discussion_r1695312427
*/
const windowSpecificAPIs = new Set([
	// Properties and methods
	// https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-window-object
	'name',
	'locationbar',
	'menubar',
	'personalbar',
	'scrollbars',
	'statusbar',
	'toolbar',
	'status',
	'close',
	'closed',
	'stop',
	'focus',
	'blur',
	'frames',
	'length',
	'top',
	'opener',
	'parent',
	'frameElement',
	'open',
	'originAgentCluster',
	'postMessage',

	// Events commonly associated with "window"
	...[...windowSpecificEvents].map(event => `on${event}`),

	// To add/remove/dispatch events that are commonly associated with "window"
	// https://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-flow
	'addEventListener',
	'removeEventListener',
	'dispatchEvent',

	// https://dom.spec.whatwg.org/#idl-index
	'event', // Deprecated and quirky, best left untouched

	// https://drafts.csswg.org/cssom-view/#idl-index
	'screen',
	'visualViewport',
	'moveTo',
	'moveBy',
	'resizeTo',
	'resizeBy',
	'innerWidth',
	'innerHeight',
	'scrollX',
	'pageXOffset',
	'scrollY',
	'pageYOffset',
	'scroll',
	'scrollTo',
	'scrollBy',
	'screenX',
	'screenLeft',
	'screenY',
	'screenTop',
	'screenWidth',
	'screenHeight',
	'devicePixelRatio',
]);

const webWorkerSpecificAPIs = new Set([
	// https://html.spec.whatwg.org/multipage/workers.html#the-workerglobalscope-common-interface
	'addEventListener',
	'removeEventListener',
	'dispatchEvent',

	'self',
	'location',
	'navigator',
	'onerror',
	'onlanguagechange',
	'onoffline',
	'ononline',
	'onrejectionhandled',
	'onunhandledrejection',

	// https://html.spec.whatwg.org/multipage/workers.html#dedicated-workers-and-the-dedicatedworkerglobalscope-interface
	'name',
	'postMessage',
	'onconnect',
]);

/**
Report the node with a message.

@param {import('estree').Node} node
*/
function getProblem(node) {
	return {
		node,
		messageId: MESSAGE_ID_ERROR,
		data: {value: node.name},
		fix: (/** @type {import('eslint').Rule.RuleFixer} fixer */ fixer) => fixer.replaceText(node, 'globalThis'),
	};
}

/**
Handle nodes and check if they should be reported.

@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Node} node
*/
function handleNode(context, node) {
	if (node.type === 'Identifier' && globalIdentifier.has(node.name) && !isShadowed(context.sourceCode.getScope(node), node)) {
		return getProblem(node);
	}
}

/**
Check if the node is a window-specific API.

@param {import('estree').MemberExpression} node
@returns {boolean}
*/
const isWindowSpecificAPI = node => {
	if (node.type !== 'MemberExpression') {
		return false;
	}

	if (node.object.name !== 'window' || node.property.type !== 'Identifier') {
		return false;
	}

	if (windowSpecificAPIs.has(node.property.name)) {
		if (['addEventListener', 'removeEventListener', 'dispatchEvent'].includes(node.property.name) && node.parent.type === 'CallExpression' && node.parent.callee === node) {
			const argument = node.parent.arguments[0];
			return argument && argument.type === 'Literal' && windowSpecificEvents.has(argument.value);
		}

		return true;
	}

	return false;
};

/**
Check if the node is a web worker specific API.

@param {import('estree').MemberExpression} node
@returns {boolean}
*/
const isWebWorkerSpecificAPI = node => node.type === 'MemberExpression' && node.object.name === 'self' && node.property.type === 'Identifier' && webWorkerSpecificAPIs.has(node.property.name);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const tracker = new GlobalReferenceTracker({
		objects: globalIdentifier,
		handle(reference) {
			const {node} = reference;

			if (node.type !== 'Identifier'
				|| isWindowSpecificAPI(node.parent)
				|| isWebWorkerSpecificAPI(node.parent)
			) {
				return
			}

			return getProblem(node);
		},
	});

	return {
		...tracker.createListeners(context),
		/** @param {import('estree').AssignmentExpression} node */
		AssignmentExpression(node) {
			return handleNode(context, node.left);
		},
		/** @param {import('estree').UpdateExpression} node */
		UpdateExpression(node) {
			return handleNode(context, node.argument);
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `globalThis` over `window`, `self`, and `global`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: false,
		messages,
	},
};
