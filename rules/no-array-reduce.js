import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getAvailableVariableName,
	getLastTrailingCommentOnSameLine,
	getParenthesizedText,
	isFunctionSelfUsedInside,
	isKnownNonNumber,
	isNodeValueNotFunction,
	isArrayPrototypeProperty,
	isSameReference,
	shouldSkipKnownNonArrayReceiver,
} from './utils/index.js';

const MESSAGE_ID_REDUCE = 'reduce';
const MESSAGE_ID_REDUCE_RIGHT = 'reduceRight';
const MESSAGE_ID_SUM_PRECISE = 'sum-precise';
const messages = {
	[MESSAGE_ID_REDUCE]: '`Array#reduce()` is not allowed. Prefer other types of loop for readability.',
	[MESSAGE_ID_REDUCE_RIGHT]: '`Array#reduceRight()` is not allowed. Prefer other types of loop for readability. You may want to call `Array#toReversed()` before looping it.',
	[MESSAGE_ID_SUM_PRECISE]: 'Switch to `Math.sumPrecise()`.',
};

const getIndent = (sourceCode, node) => sourceCode.lines[sourceCode.getLoc(node).start.line - 1].match(/^\s*/v)[0];

const isSingleDeclaratorVariableInitializer = callExpression =>
	callExpression.parent.type === 'VariableDeclarator'
	&& callExpression.parent.init === callExpression
	&& callExpression.parent.id.type === 'Identifier'
	&& callExpression.parent.parent.type === 'VariableDeclaration'
	&& callExpression.parent.parent.kind === 'const'
	&& callExpression.parent.parent.declarations.length === 1
	&& (
		callExpression.parent.parent.parent.type === 'Program'
		|| callExpression.parent.parent.parent.type === 'BlockStatement'
	);

const getCallbackReturnExpression = callback => {
	if (
		callback.type === 'ArrowFunctionExpression'
		&& callback.body.type !== 'BlockStatement'
	) {
		return callback.body;
	}

	if (
		(callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')
		&& callback.body.type === 'BlockStatement'
		&& callback.body.body.length === 1
		&& callback.body.body[0].type === 'ReturnStatement'
		&& callback.body.body[0].argument
	) {
		return callback.body.body[0].argument;
	}
};

// Whether `callback` is `(accumulator, element) => accumulator + element` (block-bodied and reversed-operand forms included).
const isSumReduceCallback = callback => {
	if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
		return false;
	}

	if (
		callback.params.length < 2
		|| callback.params[0].type !== 'Identifier'
		|| callback.params[1].type !== 'Identifier'
	) {
		return false;
	}

	const expression = getCallbackReturnExpression(callback);
	if (
		!expression
		|| expression.type !== 'BinaryExpression'
		|| expression.operator !== '+'
		|| expression.left.type !== 'Identifier'
		|| expression.right.type !== 'Identifier'
	) {
		return false;
	}

	// Operands must be exactly the accumulator and element parameters, in either order.
	const operands = new Set([expression.left.name, expression.right.name]);
	return operands.size === 2
		&& operands.has(callback.params[0].name)
		&& operands.has(callback.params[1].name);
};

function getSumPreciseSuggestions(callExpression, context) {
	const {sourceCode} = context;
	const [callback, initialValue] = callExpression.arguments;

	if (
		!isSumReduceCallback(callback)
		|| callExpression.optional
		|| callExpression.callee.optional
		// Only no initial value, or a literal `0`.
		|| (initialValue && !(initialValue.type === 'Literal' && initialValue.value === 0))
		// Don't drop comments inside the call being replaced.
		|| sourceCode.getCommentsInside(callExpression).length > 0
		// `Math.sumPrecise()` throws on non-numbers, so don't suggest it for a provably non-numeric sum (e.g. string concatenation). Only the accumulator and element parameters matter.
		|| [callback.params[0], callback.params[1]].some(parameter => isKnownNonNumber(parameter, context))
	) {
		return;
	}

	const arrayText = getParenthesizedText(callExpression.callee.object, context);
	// TODO: Offer this as an autofix (and consider reporting by default) once `Math.sumPrecise()` is widely available across runtimes (currently not in any Node.js release). See https://github.com/sindresorhus/eslint-plugin-unicorn/issues/3252
	return [{
		messageId: MESSAGE_ID_SUM_PRECISE,
		fix: fixer => fixer.replaceText(callExpression, `Math.sumPrecise(${arrayText})`),
	}];
}

const getVariableReferences = (scope, node) => findVariable(scope, node)?.references ?? [];

const isInlineCallback = node => node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';

const isSupportedCallback = node => isInlineCallback(node) || node.type === 'Identifier';

const isReferenceInside = (sourceCode, reference, node) => {
	const [referenceStart, referenceEnd] = sourceCode.getRange(reference.identifier);
	const [nodeStart, nodeEnd] = sourceCode.getRange(node);

	return referenceStart >= nodeStart && referenceEnd <= nodeEnd;
};

const hasWriteReferenceInside = (sourceCode, variable, node) =>
	variable?.references.some(reference =>
		!reference.init
		&& reference.isWrite()
		&& isReferenceInside(sourceCode, reference, node)) ?? false;

const hasReadReferenceInside = (sourceCode, variable, node) =>
	variable?.references.some(reference =>
		reference.isRead()
		&& isReferenceInside(sourceCode, reference, node)) ?? false;

const hasWriteReference = variable =>
	variable?.references.some(reference =>
		!reference.init
		&& reference.isWrite()) ?? false;

const hasParameterWrite = (sourceCode, callback) =>
	sourceCode.getDeclaredVariables(callback)
		.filter(variable => variable.defs[0].type === 'Parameter')
		.some(variable =>
			variable.references.some(reference => !reference.init && reference.isWrite()));

function isNodeMatchedInside(node, predicate) {
	if (predicate(node)) {
		return true;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') {
			continue;
		}

		if (Array.isArray(value)) {
			if (value.some(node => node?.type && isNodeMatchedInside(node, predicate))) {
				return true;
			}

			continue;
		}

		if (value?.type && isNodeMatchedInside(value, predicate)) {
			return true;
		}
	}

	return false;
}

const hasNestedMethod = node => isNodeMatchedInside(node, node =>
	node.type === 'Property'
	&& node.method);

const hasDirectEval = node => isNodeMatchedInside(node, node =>
	node.type === 'CallExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'eval');

const isShorthandPropertyReference = identifier =>
	identifier.parent.type === 'Property'
	&& identifier.parent.shorthand
	&& identifier.parent.value === identifier;

const isCallArgument = identifier =>
	identifier.parent.type === 'CallExpression'
	&& identifier.parent.arguments.includes(identifier);

const isInsideCallExpression = (node, boundaryNode) => {
	for (let {parent} = node; parent && parent !== boundaryNode; parent = parent.parent) {
		if (parent.type === 'CallExpression') {
			return true;
		}
	}

	return false;
};

const hasParameterReferenceMatching = (sourceCode, callbackScope, parameter, options) => {
	if (!parameter) {
		return false;
	}

	const {expression, predicate} = options;
	for (const {identifier} of getVariableReferences(callbackScope, parameter)) {
		if (
			!isReferenceInside(sourceCode, {identifier}, expression)
			|| sourceCode.getScope(identifier) !== callbackScope
		) {
			continue;
		}

		if (predicate(identifier)) {
			return true;
		}
	}

	return false;
};

const hasParameterMemberAccess = (sourceCode, callbackScope, parameter, expression) =>
	hasParameterReferenceMatching(sourceCode, callbackScope, parameter, {
		expression,
		predicate: identifier =>
			identifier.parent.type === 'MemberExpression'
			&& identifier.parent.object === identifier,
	});

const hasParameterMemberAccessOrCallArgument = (sourceCode, callbackScope, parameter, expression) =>
	hasParameterReferenceMatching(sourceCode, callbackScope, parameter, {
		expression,
		predicate: identifier =>
			(
				identifier.parent.type === 'MemberExpression'
				&& identifier.parent.object === identifier
			)
			|| isCallArgument(identifier),
	});

const hasUnsupportedTypeScriptSyntax = callExpression =>
	callExpression.parent.id.typeAnnotation
	|| callExpression.typeArguments
	|| callExpression.typeParameters;

const hasUnsupportedCallbackTypeScriptSyntax = callback =>
	callback.returnType
	|| callback.typeParameters
	|| callback.params.some(parameter => parameter.typeAnnotation || parameter.optional);

const hasUnsafeResultReference = (sourceCode, resultVariable, callExpression) =>
	hasWriteReference(resultVariable)
	|| hasReadReferenceInside(sourceCode, resultVariable, callExpression);

const hasUnsupportedArrayReference = (sourceCode, arrayVariable, variableDeclaration, callback) =>
	!arrayVariable
	|| arrayVariable.defs[0]?.type !== 'Variable'
	|| arrayVariable.defs[0].parent.kind !== 'const'
	|| sourceCode.getRange(arrayVariable.defs[0].node)[1] > sourceCode.getRange(variableDeclaration)[0]
	|| hasWriteReferenceInside(sourceCode, arrayVariable, variableDeclaration)
	|| hasReadReferenceInside(sourceCode, arrayVariable, callback);

const isArrayReference = (sourceCode, initialValue, arrayNode) => {
	if (!initialValue) {
		return false;
	}

	if (isSameReference(initialValue, arrayNode)) {
		return true;
	}

	const variable = findVariable(sourceCode.getScope(initialValue), initialValue);
	return initialValue.type === 'Identifier'
		&& variable?.defs[0]?.type === 'Variable'
		&& variable.defs[0].parent.kind === 'const'
		&& variable.defs[0].node.init
		&& isSameReference(variable.defs[0].node.init, arrayNode);
};

const hasEscapedAccumulatorWithArrayInitialValue = (callExpression, callback, initialValue, sourceCode) => {
	const callbackReturnExpression = getCallbackReturnExpression(callback);
	return callbackReturnExpression
		&& isArrayReference(sourceCode, initialValue, callExpression.callee.object)
		&& hasParameterMemberAccessOrCallArgument(sourceCode, sourceCode.getScope(callback), callback.params[0], callbackReturnExpression);
};

const getLocalCallbackFunction = (callback, sourceCode) => {
	const variable = findVariable(sourceCode.getScope(callback), callback);
	const definition = variable?.defs[0];
	if (
		definition?.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& isInlineCallback(definition.node.init)
		&& sourceCode.getRange(definition.node)[1] <= sourceCode.getRange(callback)[0]
	) {
		return definition.node.init;
	}
};

function getReplacedExpressionText(expression, replacements, callbackScope, options) {
	const {arrayText, context} = options;
	const {sourceCode} = context;
	const [expressionStart, expressionEnd] = sourceCode.getRange(expression);
	const textReplacements = [];

	for (const [parameter, replacement] of replacements) {
		if (
			replacement === arrayText
			&& hasWriteReferenceInside(sourceCode, findVariable(callbackScope, parameter), expression)
		) {
			return;
		}

		for (const {identifier} of getVariableReferences(callbackScope, parameter)) {
			const [start, end] = sourceCode.getRange(identifier);
			if (
				start < expressionStart
				|| end > expressionEnd
			) {
				continue;
			}

			if (sourceCode.getScope(identifier) !== callbackScope) {
				return;
			}

			if (
				replacement !== identifier.name
				&& isShorthandPropertyReference(identifier)
			) {
				return;
			}

			if (
				replacement === arrayText
				&& identifier.parent.type === 'MemberExpression'
				&& identifier.parent.object === identifier
			) {
				return;
			}

			if (
				replacement === arrayText
				&& (
					isCallArgument(identifier)
					|| isInsideCallExpression(identifier, expression)
				)
			) {
				return;
			}

			textReplacements.push({start, end, replacement});
		}
	}

	let text = sourceCode.getText(expression);
	for (const {start, end, replacement} of textReplacements.toSorted((a, b) => b.start - a.start)) {
		text = `${text.slice(0, start - expressionStart)}${replacement}${text.slice(end - expressionStart)}`;
	}

	return text;
}

function getInlineCallbackExpressionText(callback, replacementNames, context) {
	if (
		callback.async
		|| callback.generator
		|| callback.params.length > 4
		|| callback.params.some(parameter => parameter.type !== 'Identifier')
		|| hasUnsupportedCallbackTypeScriptSyntax(callback)
		|| hasParameterWrite(context.sourceCode, callback)
		|| /\b(?:arguments|this)\b/v.test(context.sourceCode.getText(callback))
	) {
		return;
	}

	const expression = getCallbackReturnExpression(callback);
	if (
		!expression
		|| expression.type === 'SequenceExpression'
		|| hasNestedMethod(expression)
		|| hasDirectEval(expression)
	) {
		return;
	}

	const expressionText = context.sourceCode.getText(expression);
	if (/=>|\b(?:class|function)\b|new\s*\.\s*target\b/v.test(expressionText)) {
		return;
	}

	const callbackScope = context.sourceCode.getScope(callback);
	if (isFunctionSelfUsedInside(callback, callbackScope)) {
		return;
	}

	if (hasParameterMemberAccess(context.sourceCode, callbackScope, callback.params[0], expression)) {
		return;
	}

	const {resultName, elementName, indexName, arrayText} = replacementNames;
	const replacements = new Map([
		[callback.params[0], resultName],
		[callback.params[1], elementName],
		[callback.params[2], indexName],
		[callback.params[3], arrayText],
	].filter(([parameter]) => parameter));

	return getReplacedExpressionText(expression, replacements, callbackScope, {arrayText, context});
}

function getLoopVariableNames(callExpression, resultName, callback, context) {
	const {sourceCode} = context;
	const scope = sourceCode.getScope(callExpression);
	const usedNames = new Set([resultName]);

	const getName = preferredName => {
		const name = getAvailableVariableName(preferredName, [scope], name => !usedNames.has(name));
		usedNames.add(name);
		return name;
	};

	return {
		elementName: getName(callback.type !== 'Identifier' && callback.params?.[1]?.type === 'Identifier' ? callback.params[1].name : 'element'),
		indexName: getName(callback.type !== 'Identifier' && callback.params?.[2]?.type === 'Identifier' ? callback.params[2].name : 'index'),
	};
}

const getCallbackCallExpressionText = (callback, replacementNames, context) =>
	`${context.sourceCode.getText(callback)}(${replacementNames.resultName}, ${replacementNames.elementName}, ${replacementNames.indexName}, ${replacementNames.arrayText})`;

function isSafeCallbackIdentifier(callback, replacementNames, context, options) {
	const {sourceCode} = context;
	const {arrayVariable, callExpression, initialValue, resultVariable} = options;
	const callbackFunction = getLocalCallbackFunction(callback, sourceCode);
	if (
		!callbackFunction
		|| hasReadReferenceInside(sourceCode, arrayVariable, callbackFunction)
		|| hasReadReferenceInside(sourceCode, resultVariable, callbackFunction)
		|| hasEscapedAccumulatorWithArrayInitialValue(callExpression, callbackFunction, initialValue, sourceCode)
	) {
		return false;
	}

	const callbackReturnExpression = getCallbackReturnExpression(callbackFunction);
	if (
		callbackReturnExpression
		&& callbackFunction.params[3]
		&& hasParameterReferenceMatching(sourceCode, sourceCode.getScope(callbackFunction), callbackFunction.params[3], {
			expression: callbackReturnExpression,
			predicate: () => true,
		})
	) {
		return false;
	}

	return Boolean(getInlineCallbackExpressionText(callbackFunction, replacementNames, context));
}

function createFix(callExpression, context) {
	const {sourceCode} = context;
	const [callback, initialValue] = callExpression.arguments;
	if (
		callExpression.callee.object.type !== 'Identifier'
		|| !isSupportedCallback(callback)
		|| hasUnsupportedTypeScriptSyntax(callExpression)
		|| (
			initialValue
			&& hasSideEffect(initialValue, sourceCode)
		)
	) {
		return;
	}

	const variableDeclaration = callExpression.parent.parent;
	const resultVariable = sourceCode.getDeclaredVariables(variableDeclaration)[0];

	if (hasUnsafeResultReference(sourceCode, resultVariable, callExpression)) {
		return;
	}

	const arrayVariable = findVariable(sourceCode.getScope(callExpression), callExpression.callee.object);
	if (hasUnsupportedArrayReference(sourceCode, arrayVariable, variableDeclaration, callback)) {
		return;
	}

	if (hasEscapedAccumulatorWithArrayInitialValue(callExpression, callback, initialValue, sourceCode)) {
		return;
	}

	const arrayText = getParenthesizedText(callExpression.callee.object, context);
	const resultName = callExpression.parent.id.name;
	const {elementName, indexName} = getLoopVariableNames(callExpression, resultName, callback, context);
	const replacementNames = {
		resultName,
		elementName,
		indexName,
		arrayText,
	};

	if (
		callback.type === 'Identifier'
		&& !isSafeCallbackIdentifier(callback, replacementNames, context, {
			arrayVariable,
			callExpression,
			initialValue,
			resultVariable,
		})
	) {
		return;
	}

	const inlineExpressionText = callback.type === 'Identifier'
		? getCallbackCallExpressionText(callback, replacementNames, context)
		: getInlineCallbackExpressionText(callback, replacementNames, context);

	if (!inlineExpressionText) {
		return;
	}

	const indent = getIndent(sourceCode, variableDeclaration);
	const bodyIndent = `${indent}\t`;
	const nestedBodyIndent = `${bodyIndent}\t`;
	const hasInitialValue = Boolean(initialValue);
	const initialValueText = hasInitialValue ? ` = ${sourceCode.getText(initialValue)}` : '';
	const loopHead = `${indent}for (const [${indexName}, ${elementName}] of ${arrayText}.entries()) {`;
	const loopBody = hasInitialValue
		? `${bodyIndent}${resultName} = ${inlineExpressionText};`
		: [
			`${bodyIndent}if (${indexName} === 0) {`,
			`${nestedBodyIndent}${resultName} = ${elementName};`,
			`${nestedBodyIndent}continue;`,
			`${bodyIndent}}`,
			'',
			`${bodyIndent}${resultName} = ${inlineExpressionText};`,
		].join('\n');
	const replacement = [
		`let ${resultName}${initialValueText};`,
		'',
		loopHead,
		loopBody,
		`${indent}}`,
	].join('\n');

	return fixer => {
		let [, end] = sourceCode.getRange(variableDeclaration);
		const nextToken = sourceCode.getTokenAfter(variableDeclaration);
		if (nextToken?.value === ';') {
			[, end] = sourceCode.getRange(nextToken);
		}

		return fixer.replaceTextRange([sourceCode.getRange(variableDeclaration)[0], end], replacement);
	};
}

const cases = [
	// `array.{reduce,reduceRight}()`
	{
		test: callExpression =>
			isMethodCall(callExpression, {
				methods: ['reduce', 'reduceRight'],
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
			})
			&& !isNodeValueNotFunction(callExpression.arguments[0]),
		getMethodNode: callExpression => callExpression.callee.property,
		getReceiver: callExpression => callExpression.callee.object,
		isSimpleOperation(callExpression) {
			const [callback] = callExpression.arguments;

			return (
				callback
				&& (
					// `array.reduce((accumulator, element) => accumulator + element)`
					(callback.type === 'ArrowFunctionExpression' && callback.body.type === 'BinaryExpression')
					// `array.reduce((accumulator, element) => {return accumulator + element;})`
					// `array.reduce(function (accumulator, element){return accumulator + element;})`
					|| (
						(callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')
						&& callback.body.type === 'BlockStatement'
						&& callback.body.body.length === 1
						&& callback.body.body[0].type === 'ReturnStatement'
						&& callback.body.body[0].argument.type === 'BinaryExpression'
					)
				)
			);
		},
		getFix(callExpression, context) {
			const variableDeclaration = callExpression.parent.parent;
			if (
				callExpression.callee.property.name !== 'reduce'
				|| callExpression.optional
				|| callExpression.callee.optional
				|| !isSingleDeclaratorVariableInitializer(callExpression)
				|| context.sourceCode.getCommentsInside(variableDeclaration).length > 0
				|| getLastTrailingCommentOnSameLine(context, variableDeclaration)
			) {
				return;
			}

			return createFix(callExpression, context);
		},
		getSuggestions: getSumPreciseSuggestions,
	},
	// `[].{reduce,reduceRight}.call()` and `Array.{reduce,reduceRight}.call()`
	{
		test: callExpression =>
			isMethodCall(callExpression, {
				method: 'call',
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayPrototypeProperty(callExpression.callee.object, {
				properties: ['reduce', 'reduceRight'],
			})
			&& (
				!callExpression.arguments[1]
				|| !isNodeValueNotFunction(callExpression.arguments[1])
			),
		getMethodNode: callExpression => callExpression.callee.object.property,
	},
	// `[].{reduce,reduceRight}.apply()` and `Array.{reduce,reduceRight}.apply()`
	{
		test: callExpression =>
			isMethodCall(callExpression, {
				method: 'apply',
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayPrototypeProperty(callExpression.callee.object, {
				properties: ['reduce', 'reduceRight'],
			}),
		getMethodNode: callExpression => callExpression.callee.object.property,
	},
];

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowSimpleOperations: {
				type: 'boolean',
				description: 'Whether to allow simple reduce operations whose callback body is a single binary expression.',
			},
		},
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {allowSimpleOperations} = context.options[0];

	context.on('CallExpression', function * (callExpression) {
		for (const {test, getMethodNode, getReceiver, isSimpleOperation, getFix, getSuggestions} of cases) {
			if (!test(callExpression)) {
				continue;
			}

			// Skip receivers that are provably not arrays (e.g. a typed `Set`)
			if (getReceiver && shouldSkipKnownNonArrayReceiver(getReceiver(callExpression), context)) {
				continue;
			}

			// TODO: Once `Math.sumPrecise()` is widely available, report (and suggest) sum reduces even when `allowSimpleOperations` is enabled, so the option only exempts operations `Math.sumPrecise()` can't express.
			if (allowSimpleOperations && isSimpleOperation?.(callExpression)) {
				continue;
			}

			const methodNode = getMethodNode(callExpression);
			yield {
				node: methodNode,
				messageId: methodNode.name,
				fix: getFix?.(callExpression, context),
				suggest: getSuggestions?.(callExpression, context),
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
			description: 'Disallow `Array#reduce()` and `Array#reduceRight()`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{allowSimpleOperations: true}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
