'use strict';

// Matches someObj.then([FunctionExpression | ArrowFunctionExpression])
function isLintablePromiseCatch(node) {
	var callee = node.callee;

	if (callee.type !== 'MemberExpression') {
		return false;
	}

	var property = callee.property;

	if (property.type !== 'Identifier' || property.name !== 'catch') {
		return false;
	}

	if (node.arguments.length === 0) {
		return false;
	}

	var arg0 = node.arguments[0];

	return arg0.type === 'FunctionExpression' || arg0.type === 'ArrowFunctionExpression';
}

module.exports = function (context) {
	var opts = context.options[0];
	var name = (opts && opts.name) || 'err';

	var stack = [];

	function push(value) {
		if (stack.length === 1) {
			stack[0] = true;
		}

		stack.push(stack.length > 0 || value);
	}

	function popAndReport(node) {
		if (!stack.pop()) {
			context.report({
				node: node,
				message: 'The catch parameter should be named `' + name + '`.'
			});
		}
	}

	return {
		'CallExpression': function (node) {
			if (isLintablePromiseCatch(node)) {
				var params = node.arguments[0].params;
				push(params.length === 0 || params[0].name === name);
			}
		},
		'CallExpression:exit': function (node) {
			if (isLintablePromiseCatch(node)) {
				popAndReport(node.arguments[0].params[0]);
			}
		},
		'CatchClause': function (node) {
			push(node.param.name === name);
		},
		'CatchClause:exit': function (node) {
			popAndReport(node.param);
		}
	};
};

module.exports.schema = [{
	type: 'object',
	properties: {
		name: {
			type: 'string'
		}
	}
}];
