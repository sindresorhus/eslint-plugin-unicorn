'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const optionsObjects = new Set();

const getAssignmentType = node => {
	const {
		left: identifier,
		right: assignment
	} = node;

	if (identifier.type !== 'Identifier') {
		return null;
	}

	if (identifier.name !== 'options' && identifier.name !== 'opts') {
		return null;
	}

	if (assignment.type === 'ObjectExpression' && assignment.properties.length > 0) {
		return 'literal';
	}

	if (assignment.type === 'Identifier' && optionsObjects.has(assignment.name)) {
		return 'variable';
	}

	return null;
};

const isOptionsDeclaration = node => {
	const {
		id: identifier,
		init: objectExpression
	} = node;

	if (identifier.type !== 'Identifier') {
		return false;
	}

	if (objectExpression.type !== 'ObjectExpression') {
		return false;
	}

	return objectExpression.properties.length > 0;
};

const fix = (fixer, sourceCode, node) => {
	const {
		left: identifier,
		right: {properties},
		parent: {body}
	} = node;

	const options = properties.map(p => sourceCode.getText(p)).join(',\n');
	const statements = body.body.map(n => sourceCode.getText(n)).join('\n');

	return [
		fixer.replaceText(node, identifier.name),
		fixer.replaceText(body, `{
			${identifier.name} = {
				${options},
				...${identifier.name}
			};${statements ? '\n\n' + statements : ''}
		}`)
	];
};

const create = context => {
	return {
		Program() {
			optionsObjects.clear();
		},
		VariableDeclarator(node) {
			if (isOptionsDeclaration(node)) {
				optionsObjects.add(node.id.name);
			}
		},
		AssignmentPattern(node) {
			const type = getAssignmentType(node);

			if (type) {
				const fixLiteral = fixer => fix(fixer, context.getSourceCode(), node);

				context.report({
					node,
					message: 'Use object spreading instead of passing default parameters with an object',
					fix: type === 'literal' ? fixLiteral : null
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
