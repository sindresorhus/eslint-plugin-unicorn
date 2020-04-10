'use strict';
const {upperFirst} = require('lodash');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_INVALID_EXPORT = 'invalidExport';
const MESSAGE_ID_INVALID_CLASS_NAME = 'invalidClassName';
const MESSAGE_ID_INVALID_NAME_PROPERTY = 'invalidNameProperty';
const MESSAGE_ID_MISSING_CONSTRUCTOR = 'missingConstructor';
const MESSAGE_ID_MISSING_SUPER = 'missingSuper';
const MESSAGE_ID_ASSIGN_MESSAGE = 'assignMessage';

const nameRegexp = /^(?:[A-Z][\da-z]*)*Error$/;

const getClassName = name => upperFirst(name).replace(/(?:error|)$/i, 'Error');

const getConstructorMethod = className => `
	constructor() {
		super();
		this.name = '${className}';
	}
`;

const hasValidSuperClass = node =>
	node &&
	node.superClass &&
	nameRegexp.test(
		node.superClass.type === 'MemberExpression' ?
			node.superClass.property.name :
			node.superClass.name
	);

const isSuperExpression = node =>
	node.type === 'ExpressionStatement' &&
	node.expression.type === 'CallExpression' &&
	node.expression.callee.type === 'Super';

const isAssignmentExpression = (node, name) =>
	node &&
	node.type === 'ExpressionStatement' &&
	node.expression.type === 'AssignmentExpression' &&
	node.expression.left &&
	node.expression.left.object &&
	node.expression.left.object.type === 'ThisExpression' &&
	node.expression.left.property &&
	node.expression.left.property.name === name;

const isClassProperty = (node, name) =>
	node &&
	node.type === 'ClassProperty' &&
	!node.computed &&
	node.key &&
	node.key.type === 'Identifier' &&
	node.key.name === name;

const checkClassName = (context, node) => {
	const {name} = node.id;
	const suggestName = getClassName(name);

	if (name !== suggestName) {
		context.report({
			node: node.id,
			messageId: MESSAGE_ID_INVALID_CLASS_NAME,
			data: {
				suggestName
			}
			// TODO: add fix or suggestion
		});
	}
};

const getClassConstructor = node => node.body.body.find(({kind}) => kind === 'constructor');

const customErrorDefinition = (context, node) => {
	if (!hasValidSuperClass(node)) {
		return;
	}

	checkClassName(context, node);

	const {name} = node.id;
	const constructor = getClassConstructor(node);

	if (!constructor) {
		context.report({
			node,
			// TODO: add name to message
			messageId: MESSAGE_ID_MISSING_CONSTRUCTOR,
			fix: fixer => fixer.insertTextAfterRange(
				[
					node.body.range[0],
					node.body.range[0] + 1
				],
				// TODO: is already has nameProperty, do not add `this.name`
				getConstructorMethod(name)
			)
		});
		return;
	}

	const constructorBodyNode = constructor.value.body;
	// Verify the constructor has a body (TypeScript)
	if (!constructorBodyNode) {
		return;
	}

	const constructorBody = constructorBodyNode.body;
	const superExpression = constructorBody.find(isSuperExpression);
	const messageExpressionIndex = constructorBody.findIndex(x => isAssignmentExpression(x, 'message'));

	if (!superExpression) {
		context.report({
			node: constructorBodyNode,
			messageId: MESSAGE_ID_MISSING_SUPER
		});
	} else if (messageExpressionIndex !== -1) {
		const expression = constructorBody[messageExpressionIndex];
		context.report({
			node: superExpression,
			messageId: MESSAGE_ID_ASSIGN_MESSAGE,
			fix: fixer => {
				const fixings = [];
				if (superExpression.expression.arguments.length === 0) {
					const rhs = expression.expression.right;
					fixings.push(
						fixer.insertTextAfterRange(
							[
								superExpression.range[0],
								superExpression.range[0] + 6
							],
							// TODO: use node text
							rhs.raw || rhs.name
						)
					);
				}

				fixings.push(
					fixer.removeRange([
						messageExpressionIndex === 0 ? constructorBodyNode.range[0] : constructorBody[messageExpressionIndex - 1].range[1],
						expression.range[1]
					])
				);
				return fixings;
			}
		});
	}

	checkNameProperty(context, node, name, constructorBody, constructorBodyNode);
};

const checkNameProperty = (context, node, name, constructorBody, constructorBodyNode) => {
	const nameExpression = constructorBody.find(x => isAssignmentExpression(x, 'name'));
	if (!nameExpression) {
		const nameProperty = node.body.body.find(node => isClassProperty(node, 'name'));
		if (!nameProperty || !nameProperty.value || nameProperty.value.value !== name) {
			context.report({
				node: nameProperty && nameProperty.value ? nameProperty.value : constructorBodyNode,
				messageId: MESSAGE_ID_INVALID_NAME_PROPERTY,
				data: {
					name
				}
			});
		}
	} else if (nameExpression.expression.right.value !== name) {
		context.report({
			node: nameExpression ? nameExpression.expression.right : constructorBodyNode,
			messageId: MESSAGE_ID_INVALID_NAME_PROPERTY,
			data: {
				name
			}
		});
	}
};

const customErrorExport = (context, node) => {
	const {right} = node;

	if (!hasValidSuperClass(right)) {
		return;
	}

	const {left} = node;
	const exportsName = left.property.name;
	const errorName = right.id.name;
	if (exportsName !== errorName) {
		context.report({
			node: left.property,
			messageId: MESSAGE_ID_INVALID_EXPORT,
			fix: fixer => fixer.replaceText(left.property, errorName)
		});
	}
};

const exportsSelector = [
	'AssignmentExpression',
	'[left.type="MemberExpression"]',
	'[left.object.name="exports"]',
	'[left.property]',
	'[right.type="ClassExpression"]',
	// Assume rule has already fixed the error name
	'[right.id.name]'
].join('');

const create = context => {
	return {
		'ClassDeclaration[id]': node => customErrorDefinition(context, node),
		'AssignmentExpression[right.type="ClassExpression"][right.id]': node => customErrorDefinition(context, node.right),
		[exportsSelector]: node => customErrorExport(context, node)
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages: {
			[MESSAGE_ID_INVALID_EXPORT]: 'Exported error name should match error class',
			[MESSAGE_ID_INVALID_CLASS_NAME]: 'Invalid class name, use `{{suggestName}}`.',
			[MESSAGE_ID_INVALID_NAME_PROPERTY]: 'The `name` property should be set to `{{name}}`.',
			[MESSAGE_ID_MISSING_CONSTRUCTOR]: 'Add a constructor to your error.',
			[MESSAGE_ID_MISSING_SUPER]: 'Missing call to `super()` in constructor.',
			[MESSAGE_ID_ASSIGN_MESSAGE]: 'Pass the error message to `super()` instead of setting `this.message`.'
		}
	}
};
