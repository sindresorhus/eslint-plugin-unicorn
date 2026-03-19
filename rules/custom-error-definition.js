import {
	upperFirst,
	getParenthesizedText,
	isNodeMatchesNameOrPath,
} from './utils/index.js';

const MESSAGE_ID_INVALID_EXPORT = 'invalidExport';
const messages = {
	[MESSAGE_ID_INVALID_EXPORT]: 'Exported error name should match error class',
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

function * checkConstructorBody(context, constructor, name, nameProperty) {
	const {sourceCode} = context;
	const constructorBodyNode = constructor.value.body;

	// Verify the constructor has a body (TypeScript)
	if (!constructorBodyNode) {
		return;
	}

	const constructorBody = constructorBodyNode.body;

	const superExpression = constructorBody.find(bodyNode => isSuperExpression(bodyNode));
	const messageExpressionIndex = constructorBody.findIndex(bodyNode => isAssignmentExpression(bodyNode, 'message'));

	if (!superExpression) {
		yield {
			node: constructorBodyNode,
			message: 'Missing call to `super()` in constructor.',
		};
	} else if (messageExpressionIndex !== -1) {
		const expression = constructorBody[messageExpressionIndex];

		yield {
			node: superExpression,
			message: 'Pass the error message to `super()` instead of setting `this.message`.',
			* fix(fixer) {
				if (superExpression.expression.arguments.length === 0) {
					const rhs = expression.expression.right;
					const [start] = sourceCode.getRange(superExpression);
					// This part crashes on ESLint 10, but it's still not correct.
					// There can be spaces, comments after `super`
					yield fixer.insertTextAfterRange(
						[start, start + 6],
						getParenthesizedText(rhs, context),
					);
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

	yield * checkConstructorBody(context, constructor, name, nameProperty);
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
