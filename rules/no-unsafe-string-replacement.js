import {
	getStaticStringValue,
	isFunction,
	isMemberExpression,
	isMethodCall,
} from './ast/index.js';
import {
	getConstVariableInitializer,
	getFunctionFromIdentifier,
	isKnownNonDomNode,
	isKnownNonString,
	isNodeValueNotDomNode,
	isUnknownType,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';
import {createTypeCheckers} from './utils/type-helpers.js';

const MESSAGE_ID = 'no-unsafe-string-replacement';
const messages = {
	[MESSAGE_ID]: 'Do not use a non-literal replacement value with `String#{{method}}()`.',
};

const receiverTypeOptions = {
	targetTypeNames: new Set(['string', 'String']),
	nonTargetTypeNames: new Set(['DOMTokenList']),
};

const isDirectReplacementFunction = (node, context) => {
	const expression = unwrapTypeScriptExpression(node);
	return isFunction(expression) || Boolean(getFunctionFromIdentifier(expression, context));
};

const {isTarget: isInferredReplacementFunction} = createTypeCheckers({
	targetTypeNames: new Set(),
	isTargetNode: isDirectReplacementFunction,
	isTargetTypeAnnotation: node => node?.type === 'TSFunctionType'
		|| (node?.type === 'TSTypeLiteral' && node.members.some(member => member.type === 'TSCallSignatureDeclaration')),
	isTargetJSDocumentType: type => type?.kind === 'function',
});

const isStaticTemplateLiteral = node =>
	node.type === 'TemplateLiteral'
	&& node.expressions.length === 0;

const isStaticStringRawTaggedTemplate = (node, sourceCode) =>
	node.type === 'TaggedTemplateExpression'
	&& isStaticTemplateLiteral(node.quasi)
	&& isMemberExpression(node.tag, {
		object: 'String',
		property: 'raw',
		optional: false,
	})
	&& sourceCode.isGlobalReference(node.tag.object);

const isSafeStringRepeat = node => {
	if (!isMethodCall(node, {
		method: 'repeat',
		optionalCall: false,
		optionalMember: false,
	})) {
		return false;
	}

	// Only the repeated string can introduce replacement patterns. Do not inspect or evaluate the repeat arguments.
	const stringValue = getStaticStringValue(unwrapTypeScriptExpression(node.callee.object));
	return stringValue !== undefined && !stringValue.includes('$');
};

const isAllowedReplacement = (node, context) => {
	const expression = unwrapTypeScriptExpression(node);

	return getStaticStringValue(expression) !== undefined
		|| isStaticStringRawTaggedTemplate(expression, context.sourceCode)
		|| isSafeStringRepeat(expression)
		|| isDirectReplacementFunction(node, context)
		|| (withTypeInformation(node, context, ({type}) => isUnknownType(type) ? undefined : type.getCallSignatures().length > 0)
			?? isInferredReplacementFunction(node, context));
};

const objectCoercionPropertyNames = new Set([
	'__proto__',
	'toString',
	'valueOf',
]);

const isPlainObjectReplacement = (node, context) => {
	node = unwrapTypeScriptExpression(node);
	const replacement = unwrapTypeScriptExpression(getConstVariableInitializer(node, context) ?? node);

	return replacement.type === 'ObjectExpression'
		&& replacement.properties.every(property =>
			property.type === 'Property'
			&& !property.computed
			&& !property.method
			&& property.kind === 'init'
			&& !objectCoercionPropertyNames.has(property.key.name ?? property.key.value));
};

const isLikelyDomClassList = (node, context) =>
	isMemberExpression(node, 'classList')
	&& !isKnownNonDomNode(node.object, context, {isNonTargetNode: isNodeValueNotDomNode});

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			methods: ['replace', 'replaceAll'],
			argumentsLength: 2,
		})) {
			return;
		}

		const [, replacement] = node.arguments;
		if (isAllowedReplacement(replacement, context) || isPlainObjectReplacement(replacement, context)) {
			return;
		}

		const {name: method} = node.callee.property;
		const canInferClassListByName = method === 'replace' && !context.sourceCode.parserServices?.program;
		if (isKnownNonString(node.callee.object, context, {
			...receiverTypeOptions,
			isNonTargetNode: receiver => receiver.type === 'ObjectExpression'
				|| (canInferClassListByName && isLikelyDomClassList(receiver, context)),
		})) {
			return;
		}

		return {
			node: replacement,
			messageId: MESSAGE_ID,
			data: {method},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow non-literal replacement values in `String#replace()` and `String#replaceAll()`.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
