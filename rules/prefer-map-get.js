import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {removeStatement} from './fix/index.js';
import isSameCollectionReference from './shared/is-same-collection-reference.js';
import {
	getAvailableVariableName,
	getCommentSafeProblem,
	getLastTrailingCommentOnSameLine,
	getLineIndent,
	getLinebreak,
	getTypeSymbol,
	hasStrictNullChecks,
	isDefaultLibrarySymbol,
	isSameBinding,
	isTypeScriptExpressionWrapper,
	isUnknownType,
	withTypeInformation,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-map-get';
const SUGGESTION_MESSAGE_ID = 'reuseGetResult';
const messages = {
	[MESSAGE_ID]: 'Reuse the result of `.get()` to check for this entry.',
	[SUGGESTION_MESSAGE_ID]: 'Read the entry before the condition and check the result.',
};

const mapTypeNames = new Set(['Map', 'ReadonlyMap', 'WeakMap']);

const hasSupportedMapValues = (receiver, allowNull, context) => withTypeInformation(receiver, context, ({type, checker, program}) => {
	const symbol = getTypeSymbol(type);
	if (!hasStrictNullChecks(program) || !mapTypeNames.has(symbol?.getName()) || !isDefaultLibrarySymbol(symbol, program)) {
		return false;
	}

	const [, valueType] = checker.getTypeArguments(type);
	if (!valueType || isUnknownType(valueType)) {
		return false;
	}

	// `NonNullable<unknown>` is `{}`. Only plain lookups can preserve null in the result's type.
	const nonNullishType = checker.getNonNullableType(checker.getUnknownType());
	const supportedType = allowNull ? checker.getUnionType([nonNullishType, checker.getNullType()]) : nonNullishType;
	return checker.isTypeAssignableTo(valueType, supportedType);
}) ?? false;

const isLookupCall = (node, method) => isMethodCall(node, {
	method,
	argumentsLength: 1,
	computed: false,
	optionalCall: false,
	optionalMember: false,
	allowSpreadElement: false,
}) && node.callee.object.type === 'Identifier';

function getSuggestion(ifStatement, declaration, getCall, context) {
	const {sourceCode} = context;
	const [{id}] = declaration.declarations;
	const {name} = id;
	const scope = sourceCode.getScope(ifStatement);
	const {start, end} = sourceCode.getLoc(declaration);
	if (
		(ifStatement.parent.type !== 'Program' && ifStatement.parent.type !== 'BlockStatement')
		|| start.line !== end.line
		|| getAvailableVariableName(name, [scope]) !== name
		|| sourceCode.getCommentsBefore(ifStatement).length > 0
		|| sourceCode.getCommentsBefore(declaration).length > 0
		|| getLastTrailingCommentOnSameLine(context, declaration)
		|| wouldRemoveComments(context, declaration)
	) {
		return;
	}

	const declarationText = `const ${sourceCode.getText(id)} = ${sourceCode.getText(getCall)};`;
	const linebreak = getLinebreak(context);
	const indentation = getLineIndent(ifStatement, context);
	const missingValue = findVariable(scope, 'undefined')?.defs.length ? 'void 0' : 'undefined';

	return {
		messageId: SUGGESTION_MESSAGE_ID,
		* fix(fixer) {
			yield fixer.insertTextBefore(ifStatement, `${declarationText}${linebreak}${indentation}`);
			yield fixer.replaceText(ifStatement.test, `${name} !== ${missingValue}`);
			yield removeStatement(declaration, context, fixer);
		},
	};
}

function getProblem(ifStatement, context) {
	const {test, consequent} = ifStatement;
	if (!isLookupCall(test, 'has') || consequent.type !== 'BlockStatement' || consequent.body.length < 2) {
		return;
	}

	const [declaration] = consequent.body;
	if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const' || declaration.declarations.length !== 1) {
		return;
	}

	const [{id, init}] = declaration.declarations;
	const getCall = init?.type === 'TSNonNullExpression' ? init.expression : init;
	const receiver = test.callee.object;
	const [key] = test.arguments;
	if (
		id.type !== 'Identifier'
		|| id.typeAnnotation
		|| !isLookupCall(getCall, 'get')
		// Type expressions on the key can refer to types scoped to the branch.
		|| isTypeScriptExpressionWrapper(getCall.arguments[0])
		|| !isSameBinding(receiver, getCall.callee.object, context)
		|| !isSameCollectionReference(key, getCall.arguments[0], context)
		|| hasSideEffect(key, context.sourceCode, {considerGetters: true})
		|| !hasSupportedMapValues(receiver, getCall === init, context)
	) {
		return;
	}

	const problem = {node: test.callee.property, messageId: MESSAGE_ID};
	const suggestion = getSuggestion(ifStatement, declaration, getCall, context);
	return suggestion
		? getCommentSafeProblem(context, {...problem, suggest: [suggestion]}, test)
		: problem;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('IfStatement', ifStatement => getProblem(ifStatement, context));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer reusing the result of `Map#get()` when checking and reading an entry.',
			recommended: true,
			requiresTypeChecking: true,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
