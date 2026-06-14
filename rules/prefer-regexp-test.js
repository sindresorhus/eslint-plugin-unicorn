import {findVariable, isParenthesized, getStaticValue} from '@eslint-community/eslint-utils';
import {checkVueTemplate} from './utils/rule.js';
import {removeMemberExpressionProperty} from './fix/index.js';
import {
	isLiteral,
	isNegativeOne,
	isRegexLiteral,
	isNewExpression,
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';
import {
	isBooleanExpression,
	isControlFlowTest,
	getBaseTypes,
	getTypeSymbol,
	getParenthesizedRange,
	isLogicalExpression,
	isString,
	isUnknownType,
	isGlobalBooleanCall,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const REGEXP_EXEC = 'regexp-exec';
const STRING_MATCH = 'string-match';
const STRING_SEARCH = 'string-search';
const SUGGESTION = 'suggestion';
const STRING = 'string';
const REGEXP = 'regexp';
const OTHER = 'other';
const STRING_OR_OTHER = 'string-or-other';
const REGEXP_OR_OTHER = 'regexp-or-other';
const UNKNOWN = 'unknown';
const messages = {
	[REGEXP_EXEC]: 'Prefer `.test(…)` over `.exec(…)`.',
	[STRING_MATCH]: 'Prefer `RegExp#test(…)` over `String#match(…)`.',
	[STRING_SEARCH]: 'Prefer `RegExp#test(…)` over `String#search(…)` when checking for existence.',
	[SUGGESTION]: 'Switch to `RegExp#test(…)`.',
};

const isLiteralZero = node => isLiteral(node, 0);

function * fixStringMethodCall(fixer, {stringNode, methodNode, regexpNode}, context) {
	const {sourceCode} = context;
	yield fixer.replaceText(methodNode, 'test');

	let stringText = sourceCode.getText(stringNode);
	if (
		!isParenthesized(regexpNode, sourceCode)
		// Only `SequenceExpression` need to add parentheses
		&& stringNode.type === 'SequenceExpression'
	) {
		stringText = `(${stringText})`;
	}

	yield fixer.replaceText(regexpNode, stringText);

	let regexpText = sourceCode.getText(regexpNode);
	if (
		!isParenthesized(stringNode, sourceCode)
		&& shouldAddParenthesesToMemberExpressionObject(regexpNode, context)
	) {
		regexpText = `(${regexpText})`;
	}

	// The nodes that pass control-flow test checks or explicit boolean expressions cannot have an ASI problem.

	yield fixer.replaceText(stringNode, regexpText);
}

const cases = [
	{
		type: REGEXP_EXEC,
		test: node => isMethodCall(node, {
			method: 'exec',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		}),
		getNodes: node => ({
			stringNode: node.arguments[0],
			methodNode: node.callee.property,
			regexpNode: node.callee.object,
		}),
		* fix(fixer, {methodNode}) {
			yield fixer.replaceText(methodNode, 'test');
		},
	},
	{
		type: STRING_MATCH,
		test: node => isMethodCall(node, {
			method: 'match',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		}),
		getNodes: node => ({
			stringNode: node.callee.object,
			methodNode: node.callee.property,
			regexpNode: node.arguments[0],
		}),
		fix: fixStringMethodCall,
	},
	{
		type: STRING_SEARCH,
		test: node => isMethodCall(node, {
			method: 'search',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		}),
		getNodes: node => ({
			stringNode: node.callee.object,
			methodNode: node.callee.property,
			regexpNode: node.arguments[0],
		}),
		fix: fixStringMethodCall,
	},
];

const isRegExpNode = node => isRegexLiteral(node) || isNewExpression(node, {name: 'RegExp'});

const getRegExpFromStaticValue = value => {
	if (Object.prototype.toString.call(value) === '[object RegExp]') {
		return value;
	}
};

const getStaticValueType = (node, scope) => {
	const result = getStaticValue(node, scope);
	if (!result) {
		return UNKNOWN;
	}

	if (typeof result.value === 'string') {
		return STRING;
	}

	if (getRegExpFromStaticValue(result.value)) {
		return REGEXP;
	}

	if (
		result.value === undefined
		&& (
			(node.type === 'Identifier' && node.name === 'undefined')
			|| (node.type === 'UnaryExpression' && node.operator === 'void')
		)
	) {
		return OTHER;
	}

	return result.value === null || ['bigint', 'boolean', 'number', 'symbol'].includes(typeof result.value)
		? OTHER
		: UNKNOWN;
};

const combineKnownTypes = types => {
	if (types.includes(UNKNOWN)) {
		return UNKNOWN;
	}

	const typeSet = new Set(types);
	const hasString = typeSet.has(STRING) || typeSet.has(STRING_OR_OTHER);
	const hasRegExp = typeSet.has(REGEXP) || typeSet.has(REGEXP_OR_OTHER);

	if (hasString && hasRegExp) {
		return STRING_OR_OTHER;
	}

	const hasOther = typeSet.has(OTHER) || typeSet.has(STRING_OR_OTHER) || typeSet.has(REGEXP_OR_OTHER);

	if (hasString) {
		return hasOther ? STRING_OR_OTHER : STRING;
	}

	if (hasRegExp) {
		return hasOther ? REGEXP_OR_OTHER : REGEXP;
	}

	return OTHER;
};

const combineIntersectionTypes = types => {
	const typeSet = new Set(types);
	if (typeSet.has(UNKNOWN)) {
		return UNKNOWN;
	}

	if (typeSet.has(REGEXP)) {
		return REGEXP;
	}

	if (typeSet.has(STRING)) {
		return STRING;
	}

	return OTHER;
};

const nonTargetTypeAnnotations = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNeverKeyword',
	'TSNullKeyword',
	'TSNumberKeyword',
	'TSObjectKeyword',
	'TSSymbolKeyword',
	'TSUndefinedKeyword',
	'TSVoidKeyword',
	'TSArrayType',
	'TSTypeLiteral',
	'TSTupleType',
	'TSFunctionType',
	'TSConstructorType',
]);

const getTypeFromTypeAnnotation = node => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeFromTypeAnnotation(node.typeAnnotation);
		}

		case 'TSStringKeyword': {
			return STRING;
		}

		case 'TSLiteralType': {
			return node.literal.type === 'Literal' && typeof node.literal.value === 'string'
				? STRING
				: OTHER;
		}

		case 'TSTypeReference': {
			if (node.typeName.type !== 'Identifier') {
				return UNKNOWN;
			}

			if (node.typeName.name === 'String') {
				return STRING;
			}

			if (node.typeName.name === 'RegExp') {
				return REGEXP;
			}

			if (node.typeName.name === 'Array' || node.typeName.name === 'ReadonlyArray') {
				return OTHER;
			}

			return UNKNOWN;
		}

		case 'TSUnionType': {
			return combineKnownTypes(node.types.map(type => getTypeFromTypeAnnotation(type)));
		}

		case 'TSIntersectionType': {
			return combineIntersectionTypes(node.types.map(type => getTypeFromTypeAnnotation(type)));
		}

		default: {
			return nonTargetTypeAnnotations.has(node?.type) ? OTHER : UNKNOWN;
		}
	}
};

const getTypeFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return UNKNOWN;
	}

	try {
		const {program} = parserServices;
		return getTypeFromTypeScriptType(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
		);
	} catch {
		return UNKNOWN;
	}
};

const getTypeFromTypeScriptType = (type, checker) => {
	if (isUnknownType(type)) {
		return UNKNOWN;
	}

	type = checker.getNonNullableType(type);

	if (isUnknownType(type)) {
		return UNKNOWN;
	}

	if (type.isTypeParameter?.()) {
		const constraint = type.getConstraint();
		return constraint ? getTypeFromTypeScriptType(constraint, checker) : UNKNOWN;
	}

	if (type.isUnion()) {
		return combineKnownTypes(type.types.map(type => getTypeFromTypeScriptType(type, checker)));
	}

	if (type.isIntersection()) {
		return combineIntersectionTypes(type.types.map(type => getTypeFromTypeScriptType(type, checker)));
	}

	if (type.intrinsicName === 'string' || type.isStringLiteral?.()) {
		return STRING;
	}

	const symbolName = getTypeSymbol(type)?.getName();
	if (symbolName === 'RegExp' || getBaseTypes(type, checker).some(type => getTypeFromTypeScriptType(type, checker) === REGEXP)) {
		return REGEXP;
	}

	return OTHER;
};

const getTypeFromVariable = (node, context, visitedVariables) => {
	const {sourceCode} = context;
	const variable = findVariable(sourceCode.getScope(node), node);
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return UNKNOWN;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const typeFromAnnotation = getTypeFromTypeAnnotation(definition.name?.typeAnnotation);
	let type = UNKNOWN;

	if (typeFromAnnotation !== UNKNOWN) {
		type = typeFromAnnotation;
	} else if (
		definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& definition.node.init
	) {
		type = getExpressionType(definition.node.init, context, visitedVariables);
	}

	visitedVariables.delete(variable);
	return type;
};

const syntaxNonTargetTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'ObjectExpression',
]);

function getExpressionType(node, context, visitedVariables = new Set()) {
	if (isRegExpNode(node)) {
		return REGEXP;
	}

	if (isString(node, context)) {
		return STRING;
	}

	switch (node.type) {
		case 'Identifier': {
			const typeFromVariable = getTypeFromVariable(node, context, visitedVariables);
			if (typeFromVariable !== UNKNOWN) {
				return typeFromVariable;
			}

			break;
		}

		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion': {
			const typeFromAnnotation = getTypeFromTypeAnnotation(node.typeAnnotation);
			return typeFromAnnotation === UNKNOWN
				? getExpressionType(node.expression, context, visitedVariables)
				: typeFromAnnotation;
		}

		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return getExpressionType(node.expression, context, visitedVariables);
		}

		case 'SequenceExpression': {
			return getExpressionType(node.expressions.at(-1), context, visitedVariables);
		}

		case 'ConditionalExpression': {
			return combineKnownTypes([
				getExpressionType(node.consequent, context, visitedVariables),
				getExpressionType(node.alternate, context, visitedVariables),
			]);
		}

		default: {
			break;
		}
	}

	const scope = context.sourceCode.getScope(node);
	const staticType = getStaticValueType(node, scope);
	if (staticType !== UNKNOWN) {
		return staticType;
	}

	if (syntaxNonTargetTypes.has(node.type)) {
		return OTHER;
	}

	return getTypeFromTypeInformation(node, context);
}

const unwrapChainExpression = node => node.type === 'ChainExpression' ? node.expression : node;

const isLengthMemberExpression = (node, object) =>
	isMemberExpression(node, {property: 'length'})
	&& node.object === object;

const isNegated = node =>
	node.parent.type === 'UnaryExpression'
	&& node.parent.operator === '!'
	&& node.parent.argument === node;

const getBooleanExpressionAncestor = (node, context) => {
	while (true) {
		if (isLogicalExpression(node.parent)) {
			node = node.parent;
			continue;
		}

		if (isGlobalBooleanCall(node.parent, context) && node.parent.arguments[0] === node) {
			node = node.parent;
			continue;
		}

		break;
	}

	return node;
};

const isNegatedBooleanValue = (node, context) => isNegated(getBooleanExpressionAncestor(node, context));

const hasCommentsInRange = (sourceCode, [start, end]) =>
	sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});

const getLengthWrapperRemovalRanges = (lengthCheck, context) => {
	const {sourceCode} = context;
	const ranges = [[
		getParenthesizedRange(lengthCheck.lengthNode.object, context)[1],
		sourceCode.getRange(lengthCheck.lengthNode)[1],
	]];

	if (lengthCheck.comparisonLeftNode) {
		ranges.push([
			getParenthesizedRange(lengthCheck.comparisonLeftNode, context)[1],
			sourceCode.getRange(lengthCheck.node)[1],
		]);
	}

	return ranges;
};

const canSuggestLengthCheck = (lengthCheck, context) =>
	getLengthWrapperRemovalRanges(lengthCheck, context)
		.every(range => !hasCommentsInRange(context.sourceCode, range));

const getSearchCheck = node => {
	const {parent} = node;
	if (
		parent?.type !== 'BinaryExpression'
		|| parent.left !== node
	) {
		return;
	}

	const {operator, right} = parent;
	if (
		(['!==', '!=', '>'].includes(operator) && isNegativeOne(right))
		|| (operator === '>=' && isLiteralZero(right))
	) {
		return {node: parent, negate: false};
	}

	if (
		(['===', '=='].includes(operator) && isNegativeOne(right))
		|| (operator === '<' && isLiteralZero(right))
	) {
		return {node: parent, negate: true};
	}
};

const getSearchCheckRemovalRange = (searchCheck, callExpression, context) => [
	getParenthesizedRange(callExpression, context)[1],
	context.sourceCode.getRange(searchCheck.node)[1],
];

const canFixSearchCheck = (searchCheck, callExpression, context) =>
	!hasCommentsInRange(
		context.sourceCode,
		getSearchCheckRemovalRange(searchCheck, callExpression, context),
	);

const getSuggestion = fixFunction => [
	{
		messageId: SUGGESTION,
		fix: fixFunction,
	},
];

const canAutofix = ({searchCheck, isRegExp, staticRegExp}) =>
	isRegExp
	|| (
		staticRegExp?.global === false
		&& (!searchCheck || staticRegExp.sticky === false)
	);

const isKnownNotString = type => [REGEXP, REGEXP_OR_OTHER, OTHER].includes(type);
const isKnownNotRegExp = type => [STRING, STRING_OR_OTHER, OTHER].includes(type);

const shouldSkipPattern = ({type, stringType, regexpType}) =>
	type === REGEXP_EXEC
		? isKnownNotRegExp(regexpType) || isKnownNotString(stringType)
		: isKnownNotString(stringType) || isKnownNotRegExp(regexpType);

const addFixOrSuggestion = (problem, fixFunction, context, {
	lengthCheck,
	searchCheck,
	callExpression,
	isRegExp,
	staticRegExp,
}) => {
	if (lengthCheck) {
		if (canSuggestLengthCheck(lengthCheck, context)) {
			problem.suggest = getSuggestion(fixFunction);
		}

		return;
	}

	if (
		searchCheck
		&& !canFixSearchCheck(searchCheck, callExpression, context)
	) {
		return;
	}

	if (
		canAutofix({
			searchCheck,
			isRegExp,
			staticRegExp,
		})
	) {
		problem.fix = fixFunction;
		return;
	}

	problem.suggest = getSuggestion(fixFunction);
};

const getLengthCheck = (node, context) => {
	const lengthNode = unwrapChainExpression(node.parent);
	if (!isLengthMemberExpression(lengthNode, node)) {
		return;
	}

	const lengthCheckNode = lengthNode.parent.type === 'ChainExpression'
		? lengthNode.parent
		: lengthNode;

	if (isNegatedBooleanValue(lengthCheckNode, context)) {
		return;
	}

	if (isBooleanExpression(lengthCheckNode, context) || isControlFlowTest(lengthCheckNode)) {
		return {lengthNode, node: lengthCheckNode};
	}

	const {parent} = lengthCheckNode;
	if (
		parent?.type === 'BinaryExpression'
		&& parent.left === lengthCheckNode
		&& parent.operator === '>'
		&& isLiteral(parent.right, 0)
		&& !isNegatedBooleanValue(parent, context)
		&& (isBooleanExpression(parent, context) || isControlFlowTest(parent))
	) {
		return {lengthNode, node: parent, comparisonLeftNode: lengthCheckNode};
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', function * (node) {
		const lengthCheck = getLengthCheck(node, context);
		const searchCheck = getSearchCheck(node);
		if (!lengthCheck && !searchCheck && !(isBooleanExpression(node, context) || isControlFlowTest(node))) {
			return;
		}

		for (const {type, test, getNodes, fix} of cases) {
			if (
				(type === STRING_SEARCH) !== Boolean(searchCheck)
			) {
				continue;
			}

			if (!test(node)) {
				continue;
			}

			const nodes = getNodes(node);
			const {methodNode, regexpNode} = nodes;

			const regexpScope = context.sourceCode.getScope(regexpNode);
			const staticResult = getStaticValue(regexpNode, regexpScope);
			const staticRegExp = staticResult ? getRegExpFromStaticValue(staticResult.value) : undefined;
			const isRegExp = isRegExpNode(regexpNode);
			const stringType = getExpressionType(nodes.stringNode, context);
			const regexpType = getExpressionType(regexpNode, context);

			if (
				shouldSkipPattern({
					type,
					stringType,
					regexpType,
				})
			) {
				continue;
			}

			const problem = {
				node: type === REGEXP_EXEC ? methodNode : node,
				messageId: type,
			};

			const fixFunction = function * (fixer) {
				if (lengthCheck) {
					yield removeMemberExpressionProperty(fixer, lengthCheck.lengthNode, context);

					if (lengthCheck.comparisonLeftNode) {
						yield fixer.removeRange([
							getParenthesizedRange(lengthCheck.comparisonLeftNode, context)[1],
							context.sourceCode.getRange(lengthCheck.node)[1],
						]);
					}
				} else if (searchCheck) {
					if (searchCheck.negate) {
						yield fixer.insertTextBefore(searchCheck.node, '!');
					}

					yield fixer.removeRange(getSearchCheckRemovalRange(searchCheck, node, context));
				}

				for (const fixResult of fix(fixer, nodes, context)) {
					yield fixResult;
				}
			};

			addFixOrSuggestion(problem, fixFunction, context, {
				lengthCheck,
				searchCheck,
				callExpression: node,
				isRegExp,
				staticRegExp,
			});

			yield problem;
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `RegExp#test()` over `String#match()`, `String#search()`, and `RegExp#exec()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
