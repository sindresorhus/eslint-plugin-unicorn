'use strict';

const isIndexOfCallExpression = node => {
	if (node.type !== 'CallExpression') {
		return false;
	}

	const property = node.callee.property;

	return property.name === 'indexOf';
};

const isUnaryNotExpression = node => (
	node.type === 'UnaryExpression' && node.operator === '!'
);

const isNegativeOne = (operator, value) => operator === '-' && value === 1;

const report = (context, node) => {
	context.report({
		node,
		message: 'Use `.includes()`, not .indexOf(), when checking for existence.'
		// fix: fixer => fixer.replaceText(node, `Array.isArray(${arraySourceCode})`)
	});
};

const create = context => ({
	BinaryExpression: node => {
		const left = node.left;
		const right = node.right;

		if (isIndexOfCallExpression(left)) {
			if (right.type === 'UnaryExpression') {
				const argument = right.argument;

				if (argument.type !== 'Literal') {
					return false;
				}

				const value = argument.value;

				if (node.operator === '!==' && isNegativeOne(right.operator, value)) {
					report(context, node);
				}
				if (node.operator === '!=' && isNegativeOne(right.operator, value)) {
					report(context, node);
				}
				if (node.operator === '>' && isNegativeOne(right.operator, value)) {
					report(context, node);
				}
			}

			if (right.type !== 'Literal') {
				return false;
			}

			if (node.operator === '>=' && right.value === 0) {
				report(context, node);
			}

			return false;
		}

		if (isUnaryNotExpression(left)) {
			const argument = left.argument;

			if (isIndexOfCallExpression(argument)) {
				if (right.type === 'UnaryExpression') {
					const argument = right.argument;

					if (argument.type !== 'Literal') {
						return false;
					}

					const value = argument.value;

					if (node.operator === '===' && isNegativeOne(right.operator, value)) {
						report(context, node);
					}
					if (node.operator === '==' && isNegativeOne(right.operator, value)) {
						report(context, node);
					}
				}

				if (right.type !== 'Literal') {
					return false;
				}

				if (node.operator === '<' && right.value === 0) {
					report(context, node);
				}

				return false;
			}
		}
	}
});

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
