'use strict';
const upperfirst = require('lodash.upperfirst');

const nameRegexp = /^(?:[A-Z][a-z0-9]*)*Error$/;

const getClassName = name => {
	name = upperfirst(name);

	const suffix = name.slice(-5);

	if (suffix === 'error') {
		return name.slice(0, name.length - 5) + 'Error';
	}

	return suffix === 'Error' ? name : `${name}Error`;
};

const getConstructorMethod = className => `
	constructor() {
		super();
		this.name = '${className}';
	}
`;

const hasValidSuperClass = node => {
	if (!node.superClass) {
		return false;
	}

	let name = node.superClass.name;

	if (node.superClass.type === 'MemberExpression') {
		name = node.superClass.property.name;
	}

	return nameRegexp.test(name);
};

const isSuperExpression = node => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' && node.expression.callee.type === 'Super';

const isAssignmentExpression = (node, name) => {
	if (node.type !== 'ExpressionStatement' || node.expression.type !== 'AssignmentExpression') {
		return false;
	}

	const lhs = node.expression.left;

	if (!lhs.object || lhs.object.type !== 'ThisExpression') {
		return false;
	}

	return lhs.property.name === name;
};

const create = context => {
	return {
		ClassDeclaration: node => {
			if (!hasValidSuperClass(node)) {
				return;
			}

			const name = node.id.name;
			const className = getClassName(name);

			if (name !== className) {
				context.report({
					node: node.id,
					message: `Invalid class name, use \`${className}\`.`,
					fix: fixer => fixer.replaceText(node.id, className)
				});
			}

			const body = node.body.body;

			const constructor = body.find(x => x.kind === 'constructor');

			if (!constructor) {
				context.report({
					node,
					message: 'Add a constructor to your error.',
					fix: fixer => fixer.insertTextAfterRange([
						node.body.start,
						node.body.start + 1
					], getConstructorMethod(className))
				});
				return;
			}

			const constructorBodyNode = constructor.value.body;
			const constructorBody = constructorBodyNode.body;

			const superExpression = constructorBody.find(isSuperExpression);
			const messageExpressionIndex = constructorBody.findIndex(x => isAssignmentExpression(x, 'message'));

			if (!superExpression) {
				context.report({
					node: constructorBodyNode,
					message: 'Missing call to `super()` in constructor.'
				});
			} else if (messageExpressionIndex !== -1 && superExpression.expression.arguments.length === 0) {
				const rhs = constructorBody[messageExpressionIndex].expression.right;

				context.report({
					node: superExpression,
					message: 'Pass the error message to `super()`.',
					fix: fixer => fixer.insertTextAfterRange([
						superExpression.start,
						superExpression.start + 6
					], rhs.raw || rhs.name)
				});
			}

			if (messageExpressionIndex !== -1) {
				const expression = constructorBody[messageExpressionIndex];

				context.report({
					node: expression,
					message: 'Pass the error message to `super()` instead of setting `this.message`.',
					fix: fixer => fixer.removeRange([
						messageExpressionIndex === 0 ? constructorBodyNode.start : constructorBody[messageExpressionIndex - 1].end,
						expression.end
					])
				});
			}

			const nameExpression = constructorBody.find(x => isAssignmentExpression(x, 'name'));
			const nameMessage = `The \`name\` property should be set to \`${className}\`.`;

			if (!nameExpression) {
				context.report({
					node: constructorBodyNode,
					message: nameMessage,
					fix: fixer => fixer.insertTextBeforeRange([
						constructorBodyNode.end - 1,
						constructorBodyNode.end - 1
					], `this.name = '${className}';\n`)
				});
			} else if (nameExpression.expression.right.value !== className) {
				context.report({
					node: nameExpression.expression.right,
					message: nameMessage,
					fix: fixer => fixer.replaceText(nameExpression.expression.right, `'${className}'`)
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
