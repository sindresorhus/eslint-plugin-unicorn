import {getStaticStringValue} from './ast/index.js';

const MESSAGE_ID_ERROR = 'prefer-global-this/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

const globalIdentifier = new Set([
	'window',
	'self',
	'global',
]);

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
const windowSpecificApis = new Set([
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
	'navigation',

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
	'outerWidth',
	'outerHeight',
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

const getStaticPropertyName = getStaticStringValue;

/**
Check if the node is a window-specific API.

@param {import('estree').MemberExpression} node
@returns {boolean}
*/
const isWindowSpecificApi = node => {
	if (node.type !== 'MemberExpression') {
		return false;
	}

	if (node.object.name !== 'window' || node.property.type !== 'Identifier') {
		return false;
	}

	if (windowSpecificApis.has(node.property.name)) {
		if (['addEventListener', 'removeEventListener', 'dispatchEvent'].includes(node.property.name) && node.parent.type === 'CallExpression' && node.parent.callee === node) {
			const argument = node.parent.arguments[0];
			return Boolean(argument) && windowSpecificEvents.has(getStaticStringValue(argument));
		}

		return true;
	}

	return false;
};

/**
@param {import('estree').Identifier} identifier
@returns {boolean}
*/
function isComputedMemberExpressionObject(identifier) {
	return identifier.parent.type === 'MemberExpression' && identifier.parent.computed && identifier.parent.object === identifier;
}

/**
Check if the identifier is the operand of a `typeof` operator, in either value position (`typeof window`) or TypeScript type position (`type T = typeof window` or `typeof window.foo`).

These are portable as-is: the runtime check works in any environment and lets bundlers tree-shake guarded code, and the type query `typeof window` is not equivalent to `typeof globalThis`.

@param {import('estree').Identifier} identifier
@returns {boolean}
*/
function isTypeofOperand(identifier) {
	const {parent} = identifier;

	if (parent.type === 'UnaryExpression' && parent.operator === 'typeof' && parent.argument === identifier) {
		return true;
	}

	// In a TypeScript type query the identifier is the leftmost part of an optional `a.b.c` chain (`TSQualifiedName`), e.g. `window` in `typeof window.foo`.
	let node = identifier;
	while (node.parent.type === 'TSQualifiedName') {
		node = node.parent;
	}

	return node.parent.type === 'TSTypeQuery';
}

/**
Check if the identifier is used in an existence check for a known window-specific API.

@param {import('estree').Identifier} identifier
@returns {boolean}
*/
function isKnownSpecificApiExistenceCheck(identifier) {
	const {parent} = identifier;
	if (parent.type !== 'BinaryExpression' || parent.operator !== 'in' || parent.right !== identifier) {
		return false;
	}

	const propertyName = getStaticPropertyName(parent.left);
	if (typeof propertyName !== 'string') {
		return false;
	}

	return windowSpecificApis.has(propertyName);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Program', function * (program) {
		const scope = context.sourceCode.getScope(program);

		const references = [
			// Variables declared at globals options
			...scope.variables.flatMap(variable => globalIdentifier.has(variable.name) ? variable.references : []),
			// Variables not declared at globals options
			...scope.through.filter(reference => globalIdentifier.has(reference.identifier.name)),
		];

		for (const {identifier} of references) {
			if (
				// `typeof window`, `typeof self`, and `typeof global` are portable as-is; leave them untouched.
				isTypeofOperand(identifier)
				|| (identifier.name === 'window' && (
					isComputedMemberExpressionObject(identifier)
					|| isKnownSpecificApiExistenceCheck(identifier)
					|| isWindowSpecificApi(identifier.parent)
				))
			) {
				continue;
			}

			yield {
				node: identifier,
				messageId: MESSAGE_ID_ERROR,
				data: {replacement: 'globalThis', value: identifier.name},
				fix: fixer => fixer.replaceText(identifier, 'globalThis'),
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `globalThis` over `window`, `self`, and `global`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: false,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
