import {findVariable} from '@eslint-community/eslint-utils';
import {isIdentifierNamed, isMethodCall} from './ast/index.js';
import {
	containsSuspensionPoint,
	getCommentSafeProblem,
	getConciseArrowBodyText,
	getConstVariableInitializer,
	getNextStatement,
	getOnlyExpression,
	hasNonDirectiveComment,
	getParenthesizedText,
	getStaticValueForControlFlow,
	isGlobalNameAvailable,
	isStringMappingType,
	isTemplateLiteralType,
	isUniqueSymbolType,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';
import {
	getEmptyArrayDeclarator,
	getForOfDeclarationPattern,
	getVariableTargetText,
	referencesVariable,
} from './shared/for-of-collection-loop.js';

const MESSAGE_ID = 'prefer-array-from-async';
const MESSAGE_ID_SUGGESTION = 'prefer-array-from-async/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `Array.fromAsync()` over array accumulation loops.',
	[MESSAGE_ID_SUGGESTION]: 'Replace the loop with `Array.fromAsync()`.',
};

const isReferenceInsideNode = (reference, node, context) => {
	const [referenceStart, referenceEnd] = context.sourceCode.getRange(reference.identifier);
	const [nodeStart, nodeEnd] = context.sourceCode.getRange(node);

	return referenceStart >= nodeStart && referenceEnd <= nodeEnd;
};

const hasWriteReferenceInsideNode = (variable, node, context) =>
	variable.references.some(reference =>
		!reference.init
		&& reference.isWrite()
		&& isReferenceInsideNode(reference, node, context),
	);

const getArrayFromAsyncText = ({
	iterable,
	binding,
	body,
	context,
}) => {
	let text = `Array.fromAsync(${getParenthesizedText(iterable, context)}`;

	if (body) {
		text += `, ${context.sourceCode.getText(binding)} => ${getConciseArrowBodyText(body, context)}`;
	}

	return `${text})`;
};

const isDirectElementPush = (pushArgument, binding) =>
	isIdentifierNamed(pushArgument, binding.name);

const getMapperBody = ({
	pushArgument,
	variable,
	loop,
	context,
}) => {
	if (
		pushArgument.type !== 'AwaitExpression'
		|| referencesVariable(variable, pushArgument.argument, context)
		|| containsSuspensionPoint(pushArgument.argument, context.sourceCode.visitorKeys)
	) {
		return;
	}

	const [bindingVariable] = context.sourceCode.getDeclaredVariables(loop.left);
	if (
		loop.left.kind === 'const'
		&& hasWriteReferenceInsideNode(bindingVariable, pushArgument.argument, context)
	) {
		return;
	}

	return pushArgument.argument;
};

const primitiveTypeNames = new Set([
	'string',
	'number',
	'boolean',
	'bigint',
	'symbol',
	'null',
	'undefined',
]);

const isPrimitiveType = (type, checker) => {
	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isPrimitiveType(constraint, checker);
	}

	if (type.isUnion()) {
		return type.types.every(type => isPrimitiveType(type, checker));
	}

	if (type.isIntersection()) {
		return type.types.some(type => isPrimitiveType(type, checker));
	}

	if (type.isLiteral()) {
		return true;
	}

	return primitiveTypeNames.has(checker.getBaseTypeOfLiteralType(type).intrinsicName)
		|| isTemplateLiteralType(type)
		|| isStringMappingType(type)
		|| isUniqueSymbolType(type);
};

const isPrimitiveIterableType = (type, checker) => {
	const constraint = checker.getBaseConstraintOfType(type);
	// Require a primitive constraint because an array-constrained subtype may add an async iterator that `Array.fromAsync()` would prefer.
	if (constraint && constraint !== type) {
		return isPrimitiveType(constraint, checker) && isPrimitiveIterableType(constraint, checker);
	}

	if (type.isUnion()) {
		return type.types.every(type => isPrimitiveIterableType(type, checker));
	}

	if (
		checker.getBaseTypeOfLiteralType(type).intrinsicName === 'string'
		|| isTemplateLiteralType(type)
		|| isStringMappingType(type)
	) {
		return true;
	}

	if (!checker.isArrayType(type) && !checker.isTupleType(type)) {
		return false;
	}

	// TypeScript's IndexKind.Number is 1.
	const elementType = checker.getIndexTypeOfType(type, 1);
	return Boolean(elementType && isPrimitiveType(elementType, checker));
};

const getVariableDeclarationVariable = (node, context) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable?.defs.some(definition => definition.type === 'Variable')) {
		return;
	}

	return variable;
};

const isKnownPrimitiveIterable = (node, context) => {
	const typeNode = node;
	node = unwrapTypeScriptExpression(node);
	const variable = getVariableDeclarationVariable(node, context);
	const initializer = getConstVariableInitializer(node, context);
	const hasOtherReferences = Boolean(variable?.references.some(reference => !reference.init && reference.identifier !== node));
	if (typeof getStaticValueForControlFlow(node, context)?.value === 'string') {
		return true;
	}

	// Local array bindings require static const analysis below; primitive-valued bindings are safe.
	const isKnownPrimitiveIterableType = withTypeInformation(typeNode, context, ({type, checker}) =>
		isPrimitiveIterableType(type, checker)
		&& (!variable || isPrimitiveType(type, checker)));
	if (isKnownPrimitiveIterableType) {
		return true;
	}

	if (node.type === 'Identifier') {
		if (!initializer || hasOtherReferences) {
			return false;
		}

		// Limit static arrays to constants used only by this loop; other references could mutate or expose them.
		node = unwrapTypeScriptExpression(initializer);
	}

	return node.type === 'ArrayExpression' && node.elements.every(element => {
		if (!element) {
			return true;
		}

		if (element.type === 'SpreadElement') {
			return false;
		}

		const result = getStaticValueForControlFlow(element, context);
		return Boolean(result && (result.value === null || !['object', 'function'].includes(typeof result.value)));
	});
};

const getLoopProblem = (declaration, context) => {
	const declarator = getEmptyArrayDeclarator(declaration);
	if (!declarator || !isGlobalNameAvailable('Array', declaration, context)) {
		return;
	}

	const loop = getNextStatement(declaration, context);
	if (loop?.type !== 'ForOfStatement') {
		return;
	}

	const expression = getOnlyExpression(loop.body);
	if (!expression) {
		return;
	}

	const binding = getForOfDeclarationPattern(loop.left);
	if (binding?.type !== 'Identifier') {
		return;
	}

	const {sourceCode} = context;
	const arrayName = declarator.id.name;
	const variable = sourceCode.getDeclaredVariables(declarator)[0];
	if (
		binding.name === arrayName
		|| referencesVariable(variable, loop.right, context)
		|| !isMethodCall(expression, {
			method: 'push',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
		|| !isIdentifierNamed(expression.callee.object, arrayName)
	) {
		return;
	}

	const [pushArgument] = expression.arguments;
	const isDirectCollection = isDirectElementPush(pushArgument, binding);
	let body;

	if (!isDirectCollection) {
		body = getMapperBody({
			pushArgument,
			variable,
			loop,
			context,
		});
		if (!body) {
			return;
		}
	}

	if (!loop.await && (!body || !isKnownPrimitiveIterable(loop.right, context))) {
		return;
	}

	const replaceRange = [
		sourceCode.getRange(declaration)[0],
		sourceCode.getRange(loop)[1],
	];
	if (hasNonDirectiveComment(context, replaceRange)) {
		return;
	}

	const fix = fixer => fixer.replaceTextRange(
		replaceRange,
		`${declaration.kind} ${getVariableTargetText(declarator, context)} = await ${getArrayFromAsyncText({
			iterable: loop.right,
			binding,
			body,
			context,
		})};`,
	);
	const problem = {
		node: loop,
		messageId: MESSAGE_ID,
	};
	if (loop.await) {
		problem.fix = fix;
	} else {
		problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION, fix}];
	}

	return getCommentSafeProblem(context, problem, replaceRange);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('VariableDeclaration', declaration => getLoopProblem(declaration, context));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Array.fromAsync()` over array accumulation loops.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
