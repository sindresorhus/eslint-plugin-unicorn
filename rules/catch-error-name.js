'use strict';

// Matches someObj.then([FunctionExpression | ArrowFunctionExpression])
function isLintablePromiseCatch(node) {
	const callee = node.callee;

	if (callee.type !== 'MemberExpression') {
		return false;
	}

	const property = callee.property;

	if (property.type !== 'Identifier' || property.name !== 'catch') {
		return false;
	}

	if (node.arguments.length === 0) {
		return false;
	}

	const arg0 = node.arguments[0];

	return arg0.type === 'FunctionExpression' || arg0.type === 'ArrowFunctionExpression';
}

const create = context => {
	const opts = context.options[0];
	const name = (opts && opts.name) || 'err';
	const stack = [];

	function push(value) {
		if (stack.length === 1) {
			stack[0] = true;
		}

		stack.push(stack.length > 0 || value);
	}

	function popAndReport(node) {
		if (!stack.pop()) {
			context.report({
				node,
				message: `The catch parameter should be named \`${name}\`.`
			});
		}
	}

	return {
		CallExpression: node => {
			if (isLintablePromiseCatch(node)) {
				const params = node.arguments[0].params;
				push(params.length === 0 || params[0].name === name);
			}
		},
		'CallExpression:exit': node => {
			if (isLintablePromiseCatch(node)) {
				popAndReport(node.arguments[0].params[0]);
			}
		},
		CatchClause: node => {
			push(node.param.name === name);
		},
		'CatchClause:exit': node => {
			popAndReport(node.param);
		}
	};
};

const schema = [{
	type: 'object',
	properties: {
		name: {
			type: 'string'
		}
	}
}];

module.exports = {
	create,
	meta: {
		schema
	}
};
