import {getPropertyName, isCommentToken} from '@eslint-community/eslint-utils';
import {
	upperFirst,
	getIndentUnit,
	getLinebreak,
	getLineIndent,
	getParenthesizedText,
	hasCommentInRange,
	isNodeMatchesNameOrPath,
	isParenthesized,
	unwrapTypeScriptExpression,
	getVisitorChildNodes,
} from './utils/index.js';
import {
	getStaticStringValue,
	isMemberExpression,
	isUndefined,
} from './ast/index.js';
import builtinErrors from './shared/builtin-errors.js';

const MESSAGE_ID_INVALID_EXPORT = 'invalidExport';
const MESSAGE_ID_DO_NOT_PASS_MESSAGE_TO_SUPER = 'doNotPassMessageToSuper';
const MESSAGE_ID_DO_NOT_ASSIGN_MESSAGE_WITHOUT_SETTER = 'doNotAssignMessageWithoutSetter';
const MESSAGE_ID_MISSING_OPTIONS_PARAMETER = 'missingOptionsParameter';
const MESSAGE_ID_INVALID_OPTIONS_PARAMETER = 'invalidOptionsParameter';
const MESSAGE_ID_PASS_MESSAGE_TO_SUPER = 'passMessageToSuper';
const MESSAGE_ID_PASS_OPTIONS_TO_SUPER = 'passOptionsToSuper';
const messages = {
	[MESSAGE_ID_INVALID_EXPORT]: 'Exported error name should match error class',
	[MESSAGE_ID_DO_NOT_PASS_MESSAGE_TO_SUPER]: 'Do not pass the error message to `super()` when the class defines a `message` accessor.',
	[MESSAGE_ID_DO_NOT_ASSIGN_MESSAGE_WITHOUT_SETTER]: 'Do not assign to `this.message` when the class defines a `message` getter without a setter.',
	[MESSAGE_ID_MISSING_OPTIONS_PARAMETER]: 'Error constructors should accept an `options` parameter.',
	[MESSAGE_ID_INVALID_OPTIONS_PARAMETER]: 'Error constructors should use a non-rest parameter named `options`.',
	[MESSAGE_ID_PASS_MESSAGE_TO_SUPER]: 'Pass the error message to `super()` as the first argument.',
	[MESSAGE_ID_PASS_OPTIONS_TO_SUPER]: 'Pass `options` to `super()` as the second argument.',
};

const nameRegexp = /^(?:[A-Z][\da-z]*)*Error$/;
// `AggregateError` accepts `ErrorOptions` as its third argument, and `SuppressedError` does not accept it.
const errorBasesWithoutStandardOptions = new Set(['AggregateError', 'SuppressedError']);

const getClassName = name => upperFirst(name).replace(/(?:error)?$/i, 'Error');

// The name property is inserted right after the class body `{`, so it follows the file's line ending and indentation
const getNameProperty = (className, classNode, context) => {
	const {sourceCode} = context;
	const linebreak = getLinebreak(context);
	// Match the indentation of the members that are already there, or one unit deeper than the class
	const [firstMember] = classNode.body.body;
	const indent = firstMember
		? getLineIndent(firstMember, context)
		: getLineIndent(classNode, context) + getIndentUnit(context);
	// The text is inserted right after the class body `{`, the rest of the body keeps its own line break
	const hasOwnLineBreak = sourceCode.text.startsWith(linebreak, sourceCode.getRange(classNode.body)[0] + 1);
	return `${linebreak}${indent}name = '${className}';${hasOwnLineBreak ? '' : linebreak + getLineIndent(classNode, context)}`;
};

const getSuperClassName = superClass => {
	if (superClass?.type === 'Identifier') {
		return superClass.name;
	}

	if (
		superClass?.type === 'MemberExpression'
		&& !superClass.computed
		&& superClass.property.type === 'Identifier'
	) {
		return superClass.property.name;
	}
};

const hasValidSuperClass = node => {
	const superClass = unwrapTypeScriptExpression(node.superClass);
	const superClassName = getSuperClassName(superClass);
	return Boolean(superClassName) && nameRegexp.test(superClassName);
};

const isNativeErrorBaseWithStandardOptions = node => {
	const superClass = unwrapTypeScriptExpression(node.superClass);
	const superClassName = getSuperClassName(superClass);

	return builtinErrors.includes(superClassName)
		&& !errorBasesWithoutStandardOptions.has(superClassName)
		&& (
			superClass.type === 'Identifier'
			|| isNodeMatchesNameOrPath(superClass, `globalThis.${superClassName}`)
		);
};

const isSuperExpression = node =>
	node.type === 'ExpressionStatement'
	&& node.expression.type === 'CallExpression'
	&& isNodeMatchesNameOrPath(node.expression.callee, 'super');

const isAssignmentExpression = (node, name) =>
	node.type === 'ExpressionStatement'
	&& node.expression.type === 'AssignmentExpression'
	&& node.expression.operator === '='
	&& isNodeMatchesNameOrPath(node.expression.left, `this.${name}`);

const createInvalidNameError = (node, name) => ({
	node,
	message: `The \`name\` property should be set to \`${name}\`.`,
});

const isPropertyDefinition = (node, name) =>
	node.type === 'PropertyDefinition'
	&& !node.static
	&& !node.computed
	&& node.key.type === 'Identifier'
	&& node.key.name === name;

const isValidNameProperty = (nameProperty, className) =>
	getStaticStringValue(unwrapTypeScriptExpression(nameProperty?.value)) === className;

const isMessageAccessor = (node, kind) =>
	node.type === 'MethodDefinition'
	&& node.kind === kind
	&& !node.static
	&& !node.computed
	&& node.key.type === 'Identifier'
	&& node.key.name === 'message';

const isMissingOrUndefined = node =>
	!node
	|| isUndefined(unwrapTypeScriptExpression(node));

const getParameterIdentifier = parameter => {
	if (parameter?.type === 'TSParameterProperty') {
		return getParameterIdentifier(parameter.parameter);
	}

	if (parameter?.type === 'Identifier') {
		return parameter;
	}

	if (
		parameter?.type === 'AssignmentPattern'
		&& parameter.left.type === 'Identifier'
	) {
		return parameter.left;
	}
};

const isOptionsIdentifier = node =>
	getParameterIdentifier(unwrapTypeScriptExpression(node))?.name === 'options';

const hasCommentImmediatelyAfter = (sourceCode, node) =>
	isCommentToken(sourceCode.getTokenAfter(node, {includeComments: true}));

const isSameUnwrappedText = (left, right, sourceCode) =>
	sourceCode.getText(unwrapTypeScriptExpression(left)) === sourceCode.getText(unwrapTypeScriptExpression(right));

const hasThisOrSuper = (node, visitorKeys) => {
	if (node.type === 'ThisExpression' || node.type === 'Super') {
		return true;
	}

	return getVisitorChildNodes(node, visitorKeys).some(childNode => hasThisOrSuper(childNode, visitorKeys));
};

const getOptionsParameterText = firstParameter => {
	const parameterIdentifier = getParameterIdentifier(firstParameter);

	if (!parameterIdentifier.typeAnnotation) {
		return 'options';
	}

	return parameterIdentifier.optional ? 'options?: ErrorOptions' : 'options: ErrorOptions';
};

const fixSuperOptionsArgument = (context, superCallExpression, messageArgumentText) => fixer => {
	const {sourceCode} = context;
	if (sourceCode.getCommentsInside(superCallExpression).length > 0) {
		return;
	}

	const superArguments = superCallExpression.arguments;

	if (superArguments.length === 0) {
		const openingParenthesis = sourceCode.getTokenAfter(superCallExpression.callee, token => token.value === '(');
		return fixer.insertTextAfter(openingParenthesis, `${messageArgumentText}, options`);
	}

	if (superArguments.length !== 1 || isParenthesized(superArguments[0], context)) {
		return;
	}

	if (
		messageArgumentText !== 'undefined'
		&& isMissingOrUndefined(superArguments[0])
	) {
		return fixer.replaceText(superArguments[0], `${messageArgumentText}, options`);
	}

	return fixer.insertTextAfter(superArguments[0], ', options');
};

const fixMissingOptionsParameter = (context, constructor, superCallExpression, messageArgumentText) => function * (fixer) {
	const {sourceCode} = context;
	const firstParameter = constructor.value.params[0];
	if (hasCommentImmediatelyAfter(sourceCode, firstParameter)) {
		return;
	}

	const superOptionsFix = fixSuperOptionsArgument(context, superCallExpression, messageArgumentText)(fixer);
	if (!superOptionsFix) {
		return;
	}

	yield fixer.insertTextAfter(firstParameter, `, ${getOptionsParameterText(firstParameter)}`);
	yield superOptionsFix;
};

const fixSuperMessageArgument = (context, superCallExpression, messageArgumentText) => fixer => {
	const {sourceCode} = context;
	if (sourceCode.getCommentsInside(superCallExpression).length > 0) {
		return;
	}

	const superArguments = superCallExpression.arguments;

	if (superArguments.length === 0) {
		const openingParenthesis = sourceCode.getTokenAfter(superCallExpression.callee, token => token.value === '(');
		return fixer.insertTextAfter(openingParenthesis, `${messageArgumentText}, options`);
	}

	if (!isMissingOrUndefined(superArguments[0]) || isParenthesized(superArguments[0], context)) {
		return;
	}

	return fixer.replaceText(
		superArguments[0],
		superArguments.length === 1 ? `${messageArgumentText}, options` : messageArgumentText,
	);
};

const isSameIdentifier = (node, identifier) => {
	node = unwrapTypeScriptExpression(node);
	return node?.type === 'Identifier'
		&& node.name === identifier.name;
};

// Whether `super()` already forwards the error options inline, e.g. `super('Fixed message', {cause})`.
const hasInlineErrorOptions = (superCallExpression, optionsParameter) => {
	const [rawMessageArgument, rawOptionsArgument] = superCallExpression.arguments;
	const optionsArgument = unwrapTypeScriptExpression(rawOptionsArgument);

	if (
		superCallExpression.arguments.length !== 2
		|| optionsArgument.type !== 'ObjectExpression'
		|| optionsArgument.properties.length !== 1
		|| getPropertyName(optionsArgument.properties[0]) !== 'cause'
	) {
		return false;
	}

	// A dedicated `options` parameter is only unneeded when `super()` already forwards its `cause`, an unrelated cause does not stand in for it.
	if (optionsParameter) {
		let causeNode = unwrapTypeScriptExpression(optionsArgument.properties[0].value);
		if (causeNode.type === 'ChainExpression') {
			causeNode = causeNode.expression;
		}

		return isMemberExpression(causeNode, {
			property: 'cause',
			object: getParameterIdentifier(optionsParameter).name,
		});
	}

	// Without one, a fixed message plus an inline cause needs no parameter either
	return getStaticStringValue(unwrapTypeScriptExpression(rawMessageArgument)) !== undefined;
};

const getErrorOptionsProblem = (context, constructor, superExpression, hasMessageAccessor) => {
	const parameters = constructor.value.params;
	const firstParameter = parameters[0];
	const firstParameterIdentifier = getParameterIdentifier(firstParameter);

	if (
		parameters.length === 0
		|| !firstParameterIdentifier
	) {
		return;
	}

	const superCallExpression = superExpression.expression;
	const optionsParameter = parameters.find(parameter => isOptionsIdentifier(parameter));

	if (optionsParameter === firstParameter) {
		if (!isOptionsIdentifier(superCallExpression.arguments[1])) {
			const problem = {
				node: superCallExpression,
				messageId: MESSAGE_ID_PASS_OPTIONS_TO_SUPER,
			};

			if (!isSameIdentifier(superCallExpression.arguments[0], firstParameterIdentifier)) {
				problem.fix = fixSuperOptionsArgument(context, superCallExpression, 'undefined');
			}

			return problem;
		}

		return;
	}

	// When `options` is already forwarded to `super()` (e.g. `super('Fixed message', {cause})` or `super(message, {cause: options.cause})`), a dedicated `options` parameter isn't needed, whether the constructor declares one or not. The message is still checked.
	const hasInlineOptions = hasInlineErrorOptions(superCallExpression, optionsParameter);
	if (hasInlineOptions && !optionsParameter) {
		return;
	}

	const shouldPassMessageToSuper = !hasMessageAccessor && firstParameterIdentifier.name === 'message';
	const messageArgumentText = shouldPassMessageToSuper ? firstParameterIdentifier.name : 'undefined';
	const secondParameter = parameters[1];
	if (!secondParameter) {
		return {
			node: firstParameter,
			messageId: MESSAGE_ID_MISSING_OPTIONS_PARAMETER,
			fix: fixMissingOptionsParameter(context, constructor, superCallExpression, messageArgumentText),
		};
	}

	if (!optionsParameter) {
		return {
			node: constructor.key,
			messageId: MESSAGE_ID_INVALID_OPTIONS_PARAMETER,
		};
	}

	if (
		shouldPassMessageToSuper
		&& !isSameIdentifier(superCallExpression.arguments[0], firstParameterIdentifier)
	) {
		return {
			node: superCallExpression,
			messageId: MESSAGE_ID_PASS_MESSAGE_TO_SUPER,
			fix: fixSuperMessageArgument(context, superCallExpression, messageArgumentText),
		};
	}

	if (hasInlineOptions || isOptionsIdentifier(superCallExpression.arguments[1])) {
		return;
	}

	const problem = {
		node: superCallExpression,
		messageId: MESSAGE_ID_PASS_OPTIONS_TO_SUPER,
	};

	if (!isSameIdentifier(superCallExpression.arguments[0], getParameterIdentifier(optionsParameter))) {
		problem.fix = fixSuperOptionsArgument(context, superCallExpression, messageArgumentText);
	}

	return problem;
};

function getInvalidErrorNameProblem(constructorBodyNode, constructorBody, errorDefinition) {
	const {name, nameProperty} = errorDefinition;
	const nameExpression = constructorBody.find(bodyNode => isAssignmentExpression(bodyNode, 'name'));

	if (!nameExpression) {
		if (!isValidNameProperty(nameProperty, name)) {
			return createInvalidNameError(nameProperty?.value ?? constructorBodyNode, name);
		}

		return;
	}

	if (getStaticStringValue(unwrapTypeScriptExpression(nameExpression.expression.right)) !== name) {
		return createInvalidNameError(nameExpression.expression.right, name);
	}
}

function * getConstructorBodyProblems(context, constructor, errorDefinition) {
	const {sourceCode} = context;
	const constructorBodyNode = constructor.value.body;

	// Verify the constructor has a body (TypeScript)
	if (!constructorBodyNode) {
		return;
	}

	const constructorBody = constructorBodyNode.body;
	const {hasMessageGetter, hasMessageSetter, checkOptions} = errorDefinition;

	const superExpressionIndex = constructorBody.findIndex(bodyNode => isSuperExpression(bodyNode));
	const superExpression = constructorBody[superExpressionIndex];
	const messageExpressionIndex = constructorBody.findIndex(bodyNode => isAssignmentExpression(bodyNode, 'message'));
	const hasMessageAccessor = hasMessageGetter || hasMessageSetter;
	let hasConstructorBodyProblem = false;

	if (!superExpression) {
		hasConstructorBodyProblem = true;
		yield {
			node: constructorBodyNode,
			message: 'Missing call to `super()` in constructor.',
		};
	} else if (hasMessageAccessor && !isMissingOrUndefined(superExpression.expression.arguments[0])) {
		hasConstructorBodyProblem = true;
		yield {
			node: superExpression,
			messageId: MESSAGE_ID_DO_NOT_PASS_MESSAGE_TO_SUPER,
		};
	} else if (
		hasMessageGetter
		&& !hasMessageSetter
		&& messageExpressionIndex !== -1
	) {
		hasConstructorBodyProblem = true;
		yield {
			node: constructorBody[messageExpressionIndex],
			messageId: MESSAGE_ID_DO_NOT_ASSIGN_MESSAGE_WITHOUT_SETTER,
		};
	} else if (!hasMessageSetter && messageExpressionIndex !== -1) {
		const expression = constructorBody[messageExpressionIndex];
		hasConstructorBodyProblem = true;

		yield {
			node: superExpression,
			message: 'Pass the error message to `super()` instead of setting `this.message`.',
			* fix(fixer) {
				if (messageExpressionIndex < superExpressionIndex) {
					return;
				}

				const rhs = expression.expression.right;
				const [firstParameter, secondParameter] = constructor.value.params;
				const firstParameterIdentifier = getParameterIdentifier(firstParameter);
				const shouldAddOptionsParameter = constructor.value.params.length === 1
					&& firstParameterIdentifier
					&& !isOptionsIdentifier(firstParameter);
				// The `super()` call is before the message assignment, so there is always a previous statement.
				const [, start] = sourceCode.getRange(constructorBody[messageExpressionIndex - 1]);
				const [, end] = sourceCode.getRange(expression);

				if (
					shouldAddOptionsParameter
					&& hasCommentImmediatelyAfter(sourceCode, firstParameter)
				) {
					return;
				}

				if (hasCommentInRange(context, [start, end]) || hasCommentImmediatelyAfter(sourceCode, expression)) {
					return;
				}

				const superCallExpression = superExpression.expression;
				if (sourceCode.getCommentsInside(superCallExpression).length > 0) {
					return;
				}

				const shouldAddOptionsArgument = shouldAddOptionsParameter || isOptionsIdentifier(secondParameter);

				if (superCallExpression.arguments.length === 0) {
					if (
						messageExpressionIndex !== superExpressionIndex + 1
						|| hasThisOrSuper(rhs, sourceCode.visitorKeys)
					) {
						return;
					}

					// Use the parenthesis token to preserve spacing between `super` and `(`.
					const openingParenthesis = sourceCode.getTokenAfter(superCallExpression.callee, token => token.value === '(');
					yield fixer.insertTextAfter(
						openingParenthesis,
						shouldAddOptionsArgument
							? `${getParenthesizedText(rhs, context)}, options`
							: getParenthesizedText(rhs, context),
					);
				} else if (!isSameUnwrappedText(superCallExpression.arguments[0], rhs, sourceCode)) {
					return;
				} else if (
					shouldAddOptionsArgument
					&& superCallExpression.arguments.length === 1
				) {
					if (isParenthesized(superCallExpression.arguments[0], context)) {
						return;
					}

					yield fixer.insertTextAfter(superCallExpression.arguments[0], ', options');
				}

				if (shouldAddOptionsParameter) {
					yield fixer.insertTextAfter(firstParameter, `, ${getOptionsParameterText(firstParameter)}`);
				}

				yield fixer.removeRange([start, end]);
			},
		};
	}

	const invalidNameProblem = getInvalidErrorNameProblem(constructorBodyNode, constructorBody, errorDefinition);
	const hasValidName = !invalidNameProblem;

	if (invalidNameProblem) {
		yield invalidNameProblem;
	}

	if (!hasValidName || !checkOptions || hasConstructorBodyProblem) {
		return;
	}

	const errorOptionsProblem = getErrorOptionsProblem(context, constructor, superExpression, hasMessageAccessor);

	if (errorOptionsProblem) {
		yield errorOptionsProblem;
	}
}

function * customErrorDefinition(context, node) {
	if (!hasValidSuperClass(node) || node.id === null) {
		return;
	}

	const {name} = node.id;
	const className = getClassName(name);

	if (name !== className) {
		yield {
			node: node.id,
			message: `Invalid class name, use \`${className}\`.`,
		};
	}

	const {body} = node.body;
	const {sourceCode} = context;
	const constructor = body.find(classNode => classNode.kind === 'constructor' && classNode.value.body)
		?? body.find(classNode => classNode.kind === 'constructor');
	const nameProperty = body.find(classNode => isPropertyDefinition(classNode, 'name'));

	if (!constructor) {
		if (isValidNameProperty(nameProperty, name)) {
			return;
		}

		const range = sourceCode.getRange(node.body);
		yield {
			...createInvalidNameError(nameProperty?.value ?? node, name),
			fix(fixer) {
				if (nameProperty?.value) {
					const value = unwrapTypeScriptExpression(nameProperty.value);
					if (getStaticStringValue(value) !== undefined) {
						return fixer.replaceText(value, `'${name}'`);
					}

					if (sourceCode.getCommentsInside(nameProperty.value).length > 0) {
						return;
					}

					return fixer.replaceText(nameProperty.value, `'${name}'`);
				}

				if (nameProperty) {
					return fixer.replaceText(nameProperty, getNameProperty(name, node, context).trim());
				}

				return fixer.insertTextAfterRange([
					range[0],
					range[0] + 1,
				], getNameProperty(name, node, context));
			},
		};

		return;
	}

	const hasMessageGetter = body.some(classNode => isMessageAccessor(classNode, 'get'));
	const hasMessageSetter = body.some(classNode => isMessageAccessor(classNode, 'set'));

	yield * getConstructorBodyProblems(context, constructor, {
		name,
		nameProperty,
		hasMessageGetter,
		hasMessageSetter,
		checkOptions: name === className && isNativeErrorBaseWithStandardOptions(node),
	});
}

const customErrorExport = node => {
	const maybeError = node.right;

	if (maybeError.type !== 'ClassExpression' || !hasValidSuperClass(maybeError) || !maybeError.id) {
		return;
	}

	// Assume rule has already fixed the error name
	const errorName = maybeError.id.name;
	const isComputed = node.left.computed;
	const exportProperty = node.left.property;
	const exportPropertyValue = unwrapTypeScriptExpression(exportProperty);
	const exportsName = isComputed
		? getStaticStringValue(exportPropertyValue)
		: exportProperty.name;

	if (exportsName === undefined || exportsName === errorName) {
		return;
	}

	const propertyToReplace = isComputed ? exportPropertyValue : exportProperty;
	const replacementText = isComputed ? `'${errorName}'` : errorName;

	return {
		node: exportProperty,
		messageId: MESSAGE_ID_INVALID_EXPORT,
		fix: fixer => fixer.replaceText(propertyToReplace, replacementText),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('ClassDeclaration', node => customErrorDefinition(context, node));
	context.on('AssignmentExpression', node => {
		if (node.right.type === 'ClassExpression') {
			return customErrorDefinition(context, node.right);
		}
	});
	context.on('AssignmentExpression', node => {
		if (
			node.left.type === 'MemberExpression'
			&& node.left.object.type === 'Identifier'
			&& node.left.object.name === 'exports'
		) {
			return customErrorExport(node);
		}
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
			description: 'Enforce correct `Error` subclassing.',
			recommended: false,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
