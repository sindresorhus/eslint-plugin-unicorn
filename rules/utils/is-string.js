import {findVariable} from '@eslint-community/eslint-utils';
import {
	getStaticStringValue,
	isMemberExpression,
	isMethodCall,
	isStringLiteral,
} from '../ast/index.js';
import {isFunctionCall, isStaticProperties} from './type-check.js';
import {isIndexedCollection} from './is-array.js';
import {isRegExp} from './is-reg-exp.js';
import {getStaticValueForControlFlow} from './get-static-value.js';
import {
	createBuiltinTypeCheckers,
	createTypeCheckers,
	hasJSDocumentTypeReference,
	target,
	unknown,
} from './type-helpers.js';

// `String(…)`
const isStringCall = node => isFunctionCall(node, 'String');

const stringMethods = new Set([
	'fromCharCode',
	'fromCodePoint',
	'raw',
]);

// `String.fromCharCode(…)` / `String.fromCodePoint(…)` / `String.raw(…)`
const isStringMethodCall = node =>
	node.type === 'CallExpression'
	&& !node.optional
	&& isStaticProperties(node.callee, 'String', stringMethods);

// `replace` and `replaceAll` can delegate to a `Symbol.replace` hook that returns a non-string.
const stringReturningMethods = [
	'charAt',
	'concat',
	'normalize',
	'padEnd',
	'padStart',
	'repeat',
	'slice',
	'substring',
	'toLocaleLowerCase',
	'toLocaleUpperCase',
	'toLowerCase',
	'toString',
	'toUpperCase',
	'toWellFormed',
	'trim',
	'trimEnd',
	'trimStart',
	'valueOf',
];

// `toJSON` can return `null` for invalid dates.
const dateStringReturningMethods = [
	'toDateString',
	'toISOString',
	'toLocaleDateString',
	'toLocaleString',
	'toLocaleTimeString',
	'toString',
	'toTimeString',
	'toUTCString',
];

const {isTarget: isDate} = createBuiltinTypeCheckers({
	name: 'Date',
	checkClassHeritage: false,
});
const regExpCheckOptions = {checkClassHeritage: false};

const isStringTypeAnnotation = node => {
	switch (node?.type) {
		case 'TSStringKeyword': {
			return true;
		}

		case 'TSLiteralType': {
			return getStaticStringValue(node.literal) !== undefined;
		}

		default: {
			return false;
		}
	}
};

const getStaticType = value =>
	typeof value === 'string' ? target : unknown;

const getUnmodifiedLetInitializer = (node, context) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	if (
		definition?.type !== 'Variable'
		|| definition.parent?.kind !== 'let'
		|| definition.node.id !== definition.name
		|| !definition.node.init
		|| variable.references.some(reference => reference.isWrite() && !reference.init)
	) {
		return;
	}

	return definition.node.init;
};

const isStringNode = (node, context, isTarget) => {
	if (
		isStringLiteral(node)
		|| isStringCall(node)
		|| isStringMethodCall(node)
	) {
		return true;
	}

	switch (node.type) {
		case 'MemberExpression': {
			return isMemberExpression(node, {properties: ['source', 'flags'], optional: false})
				&& isRegExp(node.object, context, regExpCheckOptions);
		}

		case 'TaggedTemplateExpression': {
			return isMemberExpression(node.tag, {object: 'String', property: 'raw', optional: false});
		}

		case 'CallExpression': {
			if (isMethodCall(node, {method: 'join', optionalCall: false, optionalMember: false})) {
				return isIndexedCollection(node.callee.object, context);
			}

			if (
				isMethodCall(node, {
					methods: dateStringReturningMethods,
					optionalCall: false,
					optionalMember: false,
				})
				&& isDate(node.callee.object, context)
			) {
				return true;
			}

			return isMethodCall(node, {
				methods: stringReturningMethods,
				optionalCall: false,
				optionalMember: false,
			}) && isString(node.callee.object, context, isTarget);
		}

		case 'TemplateLiteral': {
			return true;
		}

		case 'UnaryExpression': {
			return node.operator === 'typeof';
		}

		case 'BinaryExpression':
		case 'AssignmentExpression': {
			if (node.operator === '=') {
				return isString(node.right, context, isTarget);
			}

			return ['+', '+='].includes(node.operator)
				&& (isString(node.left, context, isTarget) || isString(node.right, context, isTarget));
		}

		default: {
			return false;
		}
	}
};

const {
	isTarget: isStringTarget,
	isKnownNonTarget: isKnownNonString,
} = createTypeCheckers({
	targetTypeNames: new Set(['string']),
	targetCallNames: ['String', 'Date', 'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent', 'atob', 'btoa'],
	isTargetNode: isStringNode,
	isTargetTypeAnnotation: isStringTypeAnnotation,
	isTargetType: type => type.isStringLiteral?.() || type.intrinsicName === 'string',
	getStaticType,
});

export default function isString(node, context, isTarget = isStringTarget) {
	if (!node) {
		return false;
	}

	if (
		node.type === 'TSSatisfiesExpression'
		&& isStringTypeAnnotation(node.typeAnnotation)
	) {
		return true;
	}

	if (isTarget(node, context)) {
		return true;
	}

	const staticValue = getStaticValueForControlFlow(getUnmodifiedLetInitializer(node, context) ?? node, context);
	return typeof staticValue?.value === 'string' && !hasJSDocumentTypeReference(node, context);
}

export {
	isKnownNonString,
};
