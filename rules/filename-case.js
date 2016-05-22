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

var leadingUnserscoresRegex = /^(_+)(.*)$/;
function splitFilename(filename) {
	var res = leadingUnserscoresRegex.exec(filename);
	return {
		leading: (res && res[1]) || '',
		trailing: (res && res[2]) || filename
	};
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
			var splitName = splitFilename(filename);
			var fixedFilename = fixFilename(chosenCase, splitName.trailing);

			if (fixedFilename !== splitName.trailing) {
				context.report({
					node: node,
					message: 'Filename is not in ' + chosenCase.name +
						'. Rename it to `' + splitName.leading + fixedFilename + extension + '`.'
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
