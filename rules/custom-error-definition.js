import {
	upperFirst,
	getParenthesizedText,
	isNodeMatchesNameOrPath,
} from './utils/index.js';
import {isUndefined} from './ast/index.js';

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
	[MESSAGE_ID_MISSING_OPTIONS_PARAMETER]: 'Error constructors should accept `options` as the second parameter.',
	[MESSAGE_ID_INVALID_OPTIONS_PARAMETER]: 'Error constructors should use `options` as the second parameter.',
	[MESSAGE_ID_PASS_MESSAGE_TO_SUPER]: 'Pass the error message to `super()` as the first argument.',
	[MESSAGE_ID_PASS_OPTIONS_TO_SUPER]: 'Pass `options` to `super()` as the second argument.',
};

const nameRegexp = /^(?:[A-Z][\da-z]*)*Error$/;

const getClassName = name => upperFirst(name).replace(/(?:error)?$/i, 'Error');

const getNameProperty = className => `
	name = '${className}';
`;

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
	const superClassName = getSuperClassName(node.superClass);
	return Boolean(superClassName) && nameRegexp.test(superClassName);
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
	nameProperty?.value
	&& nameProperty.value.value === className;

const isMessageAccessor = (node, kind) =>
	node.type === 'MethodDefinition'
	&& node.kind === kind
	&& !node.static
	&& !node.computed
	&& node.key.type === 'Identifier'
	&& node.key.name === 'message';

const isMissingOrUndefined = node =>
	!node
	|| isUndefined(node);

const getParameterIdentifier = parameter => {
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
	getParameterIdentifier(node)?.name === 'options';

const isSameText = (left, right, sourceCode) =>
	sourceCode.getText(left) === sourceCode.getText(right);

const hasThisOrSuper = (node, visitorKeys) => {
	if (node.type === 'ThisExpression' || node.type === 'Super') {
		return true;
	}

	const keys = visitorKeys[node.type] ?? [];

	for (const key of keys) {
		const value = node[key];

		if (!value) {
			continue;
		}

		if (Array.isArray(value)) {
			if (value.some(childNode => childNode && hasThisOrSuper(childNode, visitorKeys))) {
				return true;
			}

			continue;
		}

		if (hasThisOrSuper(value, visitorKeys)) {
			return true;
		}
	}

	return false;
};

const getOptionsParameterText = firstParameter => {
	const parameterIdentifier = getParameterIdentifier(firstParameter);

	if (!parameterIdentifier.typeAnnotation) {
		return 'options';
	}

	return parameterIdentifier.optional ? 'options?: ErrorOptions' : 'options: ErrorOptions';
};

const fixSuperOptionsArgument = (sourceCode, superCallExpression, messageArgumentText) => fixer => {
	const superArguments = superCallExpression.arguments;

	if (superArguments.length === 0) {
		const openingParenthesis = sourceCode.getTokenAfter(superCallExpression.callee, token => token.value === '(');
		return fixer.insertTextAfter(openingParenthesis, `${messageArgumentText}, options`);
	}

	if (superArguments.length === 1) {
		if (
			messageArgumentText !== 'undefined'
			&& isMissingOrUndefined(superArguments[0])
		) {
			return fixer.replaceText(superArguments[0], `${messageArgumentText}, options`);
		}

		return fixer.insertTextAfter(superArguments[0], ', options');
	}
};

const fixMissingOptionsParameter = (context, constructor, superCallExpression, messageArgumentText) => function * (fixer) {
	const {sourceCode} = context;
	const firstParameter = constructor.value.params[0];
	const superOptionsFix = fixSuperOptionsArgument(sourceCode, superCallExpression, messageArgumentText)(fixer);

	if (!superOptionsFix) {
		return;
	}

	yield fixer.insertTextAfter(firstParameter, `, ${getOptionsParameterText(firstParameter)}`);
	yield superOptionsFix;
};

const fixSuperMessageArgument = (sourceCode, superCallExpression, messageArgumentText) => fixer => {
	const superArguments = superCallExpression.arguments;

	if (superArguments.length === 0) {
		const openingParenthesis = sourceCode.getTokenAfter(superCallExpression.callee, token => token.value === '(');
		return fixer.insertTextAfter(openingParenthesis, `${messageArgumentText}, options`);
	}

	if (isMissingOrUndefined(superArguments[0])) {
		return fixer.replaceText(
			superArguments[0],
			superArguments.length === 1 ? `${messageArgumentText}, options` : messageArgumentText,
		);
	}
};

const isSameIdentifier = (node, identifier) =>
	node?.type === 'Identifier'
	&& node.name === identifier.name;

const checkErrorOptions = (context, constructor, superExpression, hasMessageAccessor) => {
	const parameters = constructor.value.params;
	const firstParameter = parameters[0];
	const firstParameterIdentifier = getParameterIdentifier(firstParameter);

	if (
		parameters.length === 0
		|| !firstParameterIdentifier
	) {
		return;
	}

	const optionsParameter = parameters[1];
	const superCallExpression = superExpression.expression;
	const shouldPassMessageToSuper = !hasMessageAccessor && firstParameterIdentifier.name === 'message';
	const messageArgumentText = shouldPassMessageToSuper ? firstParameterIdentifier.name : 'undefined';

	if (isOptionsIdentifier(firstParameter)) {
		if (!isOptionsIdentifier(superCallExpression.arguments[1])) {
			const problem = {
				node: superCallExpression,
				messageId: MESSAGE_ID_PASS_OPTIONS_TO_SUPER,
			};

			if (!isSameIdentifier(superCallExpression.arguments[0], firstParameterIdentifier)) {
				problem.fix = fixSuperOptionsArgument(context.sourceCode, superCallExpression, 'undefined');
			}

			return problem;
		}

		return;
	}

	if (!optionsParameter) {
		return {
			node: firstParameter,
			messageId: MESSAGE_ID_MISSING_OPTIONS_PARAMETER,
			fix: fixMissingOptionsParameter(context, constructor, superCallExpression, messageArgumentText),
		};
	}

	if (!isOptionsIdentifier(optionsParameter)) {
		return {
			node: optionsParameter,
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
			fix: fixSuperMessageArgument(context.sourceCode, superCallExpression, messageArgumentText),
		};
	}

	if (!isOptionsIdentifier(superCallExpression.arguments[1])) {
		return {
			node: superCallExpression,
			messageId: MESSAGE_ID_PASS_OPTIONS_TO_SUPER,
			fix: fixSuperOptionsArgument(context.sourceCode, superCallExpression, messageArgumentText),
		};
	}
};

function * checkErrorName(constructorBodyNode, constructorBody, errorDefinition) {
	const {name, nameProperty} = errorDefinition;
	const nameExpression = constructorBody.find(bodyNode => isAssignmentExpression(bodyNode, 'name'));

	if (!nameExpression) {
		if (!isValidNameProperty(nameProperty, name)) {
			yield createInvalidNameError(nameProperty?.value ?? constructorBodyNode, name);
			return false;
		}

		return true;
	}

	if (
		nameExpression.expression.right.type !== 'Literal'
		|| nameExpression.expression.right.value !== name
	) {
		yield createInvalidNameError(nameExpression.expression.right ?? constructorBodyNode, name);
		return false;
	}

	return true;
}

function * checkConstructorBody(context, constructor, errorDefinition) {
	const {sourceCode} = context;
	const constructorBodyNode = constructor.value.body;

	// Verify the constructor has a body (TypeScript)
	if (!constructorBodyNode) {
		return;
	}

	const constructorBody = constructorBodyNode.body;
	const {hasMessageGetter, hasMessageSetter, checkOptions} = errorDefinition;

	const superExpression = constructorBody.find(bodyNode => isSuperExpression(bodyNode));
	const superExpressionIndex = constructorBody.findIndex(bodyNode => isSuperExpression(bodyNode));
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
				const rhs = expression.expression.right;
				const [firstParameter, secondParameter] = constructor.value.params;
				const firstParameterIdentifier = getParameterIdentifier(firstParameter);
				const shouldAddOptionsParameter = constructor.value.params.length === 1
					&& firstParameterIdentifier
					&& !isOptionsIdentifier(firstParameter);
				const shouldAddOptionsArgument = shouldAddOptionsParameter || isOptionsIdentifier(secondParameter);

				if (superExpression.expression.arguments.length === 0) {
					if (
						messageExpressionIndex !== superExpressionIndex + 1
						|| hasThisOrSuper(rhs, sourceCode.visitorKeys)
					) {
						return;
					}

					const [start] = sourceCode.getRange(superExpression);
					// This part crashes on ESLint 10, but it's still not correct.
					// There can be spaces, comments after `super`
					yield fixer.insertTextAfterRange(
						[start, start + 6],
						shouldAddOptionsArgument
							? `${getParenthesizedText(rhs, context)}, options`
							: getParenthesizedText(rhs, context),
					);
				} else if (!isSameText(superExpression.expression.arguments[0], rhs, sourceCode)) {
					return;
				} else if (
					shouldAddOptionsArgument
					&& superExpression.expression.arguments.length === 1
				) {
					yield fixer.insertTextAfter(superExpression.expression.arguments[0], ', options');
				}

				if (shouldAddOptionsParameter) {
					yield fixer.insertTextAfter(firstParameter, `, ${getOptionsParameterText(firstParameter)}`);
				}

				const start = messageExpressionIndex === 0
					? sourceCode.getRange(constructorBodyNode)[0]
					: sourceCode.getRange(constructorBody[messageExpressionIndex - 1])[1];
				const [, end] = sourceCode.getRange(expression);
				yield fixer.removeRange([start, end]);
			},
		};
	}

	const hasValidName = yield * checkErrorName(constructorBodyNode, constructorBody, errorDefinition);

	if (hasValidName && checkOptions && !hasConstructorBodyProblem) {
		const errorOptionsProblem = checkErrorOptions(context, constructor, superExpression, hasMessageAccessor);

		if (errorOptionsProblem) {
			yield errorOptionsProblem;
		}
	}
}

function * customErrorDefinition(context, node) {
	if (!hasValidSuperClass(node)) {
		return;
	}

	if (node.id === null) {
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
	const constructor = body.find(x => x.kind === 'constructor');
	const nameProperty = body.find(classNode => isPropertyDefinition(classNode, 'name'));
	const hasMessageGetter = body.some(classNode => isMessageAccessor(classNode, 'get'));
	const hasMessageSetter = body.some(classNode => isMessageAccessor(classNode, 'set'));

	if (!constructor) {
		if (isValidNameProperty(nameProperty, name)) {
			return;
		}

		const range = sourceCode.getRange(node.body);
		yield {
			...createInvalidNameError(nameProperty?.value ?? node, name),
			fix(fixer) {
				if (nameProperty?.value) {
					return fixer.replaceText(nameProperty.value, `'${name}'`);
				}

				if (nameProperty) {
					return fixer.replaceText(nameProperty, getNameProperty(name).trim());
				}

				return fixer.insertTextAfterRange([
					range[0],
					range[0] + 1,
				], getNameProperty(name));
			},
		};

		return;
	}

	yield * checkConstructorBody(context, constructor, {
		name,
		nameProperty,
		hasMessageGetter,
		hasMessageSetter,
		checkOptions: name === className,
	});
}

const customErrorExport = (context, node) => {
	const exportsName = node.left.property.name;

	const maybeError = node.right;

	if (maybeError.type !== 'ClassExpression') {
		return;
	}

	if (!hasValidSuperClass(maybeError)) {
		return;
	}

	if (!maybeError.id) {
		return;
	}

	// Assume rule has already fixed the error name
	const errorName = maybeError.id.name;

	if (exportsName === errorName) {
		return;
	}

	return {
		node: node.left.property,
		messageId: MESSAGE_ID_INVALID_EXPORT,
		fix: fixer => fixer.replaceText(node.left.property, errorName),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
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
			return customErrorExport(context, node);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
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
	},
};

export default config;
