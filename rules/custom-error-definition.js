import {
	upperFirst,
	getParenthesizedText,
	isNodeMatchesNameOrPath,
} from './utils/index.js';
import {isUndefined} from './ast/index.js';

const MESSAGE_ID_INVALID_EXPORT = 'invalidExport';
const MESSAGE_ID_DO_NOT_PASS_MESSAGE_TO_SUPER = 'doNotPassMessageToSuper';
const MESSAGE_ID_DO_NOT_ASSIGN_MESSAGE_WITHOUT_SETTER = 'doNotAssignMessageWithoutSetter';
const messages = {
	[MESSAGE_ID_INVALID_EXPORT]: 'Exported error name should match error class',
	[MESSAGE_ID_DO_NOT_PASS_MESSAGE_TO_SUPER]: 'Do not pass the error message to `super()` when the class defines a `message` accessor.',
	[MESSAGE_ID_DO_NOT_ASSIGN_MESSAGE_WITHOUT_SETTER]: 'Do not assign to `this.message` when the class defines a `message` getter without a setter.',
};

const nameRegexp = /^(?:[A-Z][\da-z]*)*Error$/;

const getClassName = name => upperFirst(name).replace(/(?:error|)$/i, 'Error');

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

function * checkConstructorBody(context, constructor, errorDefinition) {
	const {sourceCode} = context;
	const constructorBodyNode = constructor.value.body;

	// Verify the constructor has a body (TypeScript)
	if (!constructorBodyNode) {
		return;
	}

	const constructorBody = constructorBodyNode.body;
	const {name, nameProperty, hasMessageGetter, hasMessageSetter} = errorDefinition;

	const superExpression = constructorBody.find(bodyNode => isSuperExpression(bodyNode));
	const superExpressionIndex = constructorBody.findIndex(bodyNode => isSuperExpression(bodyNode));
	const messageExpressionIndex = constructorBody.findIndex(bodyNode => isAssignmentExpression(bodyNode, 'message'));
	const hasMessageAccessor = hasMessageGetter || hasMessageSetter;

	if (!superExpression) {
		yield {
			node: constructorBodyNode,
			message: 'Missing call to `super()` in constructor.',
		};
	} else if (hasMessageAccessor && !isMissingOrUndefined(superExpression.expression.arguments[0])) {
		yield {
			node: superExpression,
			messageId: MESSAGE_ID_DO_NOT_PASS_MESSAGE_TO_SUPER,
		};
	} else if (
		hasMessageGetter
		&& !hasMessageSetter
		&& messageExpressionIndex !== -1
	) {
		yield {
			node: constructorBody[messageExpressionIndex],
			messageId: MESSAGE_ID_DO_NOT_ASSIGN_MESSAGE_WITHOUT_SETTER,
		};
	} else if (!hasMessageSetter && messageExpressionIndex !== -1) {
		const expression = constructorBody[messageExpressionIndex];

		yield {
			node: superExpression,
			message: 'Pass the error message to `super()` instead of setting `this.message`.',
			* fix(fixer) {
				const rhs = expression.expression.right;

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
						getParenthesizedText(rhs, context),
					);
				} else if (!isSameText(superExpression.expression.arguments[0], rhs, sourceCode)) {
					return;
				}

				const start = messageExpressionIndex === 0
					? sourceCode.getRange(constructorBodyNode)[0]
					: sourceCode.getRange(constructorBody[messageExpressionIndex - 1])[1];
				const [, end] = sourceCode.getRange(expression);
				yield fixer.removeRange([start, end]);
			},
		};
	}

	const nameExpression = constructorBody.find(bodyNode => isAssignmentExpression(bodyNode, 'name'));
	if (!nameExpression) {
		if (!isValidNameProperty(nameProperty, name)) {
			yield createInvalidNameError(nameProperty?.value ?? constructorBodyNode, name);
		}

		return;
	}

	if (
		nameExpression.expression.right.type !== 'Literal'
		|| nameExpression.expression.right.value !== name
	) {
		yield createInvalidNameError(nameExpression.expression.right ?? constructorBodyNode, name);
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
