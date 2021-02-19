'use strict';
const {findVariable} = require('eslint-utils');
const getVariableIdentifiers = require('./utils/get-variable-identifiers');
const getDocumentationUrl = require('./utils/get-documentation-url');

const ERROR_FIXABLE = 'fixable';
const ERROR_NOT_FIXABLE = 'not-fixable';
const messages = {
	[ERROR_FIXABLE]: 'Use `{{id}}` instead of `{{object}}`.',
	[ERROR_NOT_FIXABLE]: 'Do not use `{{object}}` in static method.'
};

function isIdNodeAvailable(node, scope) {
	if (!node || node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(scope, node);

	return !variable || getVariableIdentifiers(variable).includes(node);
}

function create(context) {
	const classStack = [];

	return {
		'ClassExpression, ClassDeclaration'(node) {
			classStack.push(node);
		},
		'ClassExpression, ClassDeclaration:exit'() {
			classStack.pop();
		},
		'MethodDefinition[static=true] :matches(ThisExpression, Super)'(node) {
			const currentClass = classStack[classStack.length - 1];

			/* istanbul ignore next */
			if (!currentClass) {
				return;
			}

			const object = node.type === 'Super' ? 'super' : 'this';
			const idNode = node.type === 'Super' ? currentClass.superClass : currentClass.id;
			const id = isIdNodeAvailable(idNode, context.getScope()) ? idNode.name : '';
			const messageId = id ? ERROR_FIXABLE : ERROR_NOT_FIXABLE;

			const problem = {
				node,
				messageId,
				data: {
					id,
					object
				}
			};

			if (id) {
				problem.fix = fixer => fixer.replaceText(node, id);
			}

			context.report(problem);
		}
	};
}

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
