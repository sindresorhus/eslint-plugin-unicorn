'use strict';
var path = require('path');
var camelCase = require('lodash.camelcase');
var kebabCase = require('lodash.kebabcase');
var snakeCase = require('lodash.snakecase');
var upperfirst = require('lodash.upperfirst');

var pascalCase = function (str) {
	return upperfirst(camelCase(str));
};

var numberRegex = /(\d+)/;
var PLACEHOLDER = '\uFFFF\uFFFF\uFFFF';
var PLACEHOLDER_REGEX = new RegExp(PLACEHOLDER, 'i');

function ignoreNumbers(fn) {
	return function (string) {
		var stack = [];
		var execResult = numberRegex.exec(string);
		while (execResult) {
			stack.push(execResult[0]);
			string = string.replace(execResult[0], PLACEHOLDER);
			execResult = numberRegex.exec(string);
		}

		var withCase = fn(string);
		while (stack.length > 0) {
			withCase = withCase.replace(PLACEHOLDER_REGEX, stack.shift());
		}

		return withCase;
	};
}

var cases = {
	camelCase: {
		fn: camelCase,
		name: 'camel case'
	},
	kebabCase: {
		fn: kebabCase,
		name: 'kebab case'
	},
	snakeCase: {
		fn: snakeCase,
		name: 'snake case'
	},
	pascalCase: {
		fn: pascalCase,
		name: 'pascal case'
	}
};

function fixFilename(chosenCase, filename) {
	return filename
		.split('.')
		.map(ignoreNumbers(chosenCase.fn))
		.join('.');
}

module.exports = function (context) {
	var chosenCase = cases[context.options[0].case || 'camelCase'];
	var filenameWithExt = context.getFilename();

	if (filenameWithExt === '<text>') {
		return {};
	}

	return {
		Program: function (node) {
			var extension = path.extname(filenameWithExt);
			var filename = path.basename(filenameWithExt, extension);
			var fixedFilename = fixFilename(chosenCase, filename);

			if (fixedFilename !== filename) {
				context.report({
					node: node,
					message: 'Filename is not in ' + chosenCase.name + '. Rename it to `' + fixedFilename + extension + '`.'
				});
			}
		}
	};
};

module.exports.schema = [{
	type: 'object',
	properties: {
		case: {
			enum: [
				'camelCase',
				'snakeCase',
				'kebabCase',
				'pascalCase'
			]
		}
	}
}];
