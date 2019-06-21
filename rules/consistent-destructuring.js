'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID = 'consistentDestructuring';

const fix = (fixer, source, objectPattern, memberExpression) => {
	const member = source.getText(memberExpression.property);
	const {properties} = objectPattern;
	const declarations = properties.map(property => source.getText(property));
	const fixings = [fixer.replaceText(memberExpression, member)];

	// Member is not already destructured
	if (!declarations.includes(member)) {
		const lastProperty = properties[properties.length - 1];

		if (lastProperty) {
			fixings.push(fixer.insertTextAfter(lastProperty, `, ${member}`));
		} else {
			fixings.push(fixer.replaceText(objectPattern, `{${member}}`));
		}
	}

	return fixings;
};

const create = context => {
	const source = context.getSourceCode();
	const declarations = new Map();

	return {
		'VariableDeclarator[id.type="ObjectPattern"][init.type!="Literal"]'(node) {
			declarations.set(source.getText(node.init), node.id);
		},
		MemberExpression(node) {
			const {parent, object} = node;

			// Ignore member function calls
			if (parent.type === 'CallExpression' && parent.callee === node) {
				return;
			}

			const objectPattern = declarations.get(source.getText(object));

			if (objectPattern) {
				const isNested = parent.type === 'MemberExpression';

				context.report({
					node,
					messageId: MESSAGE_ID,
					fix: isNested ? null : fixer => fix(fixer, source, objectPattern, node)
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code',
		messages: {
			[MESSAGE_ID]: 'Use destructured variables over properties.'
		}
	}
};
