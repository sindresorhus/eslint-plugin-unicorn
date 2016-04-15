'use strict';
var path = require('path');
var camelCase = require('lodash.camelcase');
var kebabCase = require('lodash.kebabcase');
var snakeCase = require('lodash.snakecase');

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
	}
};

function fixFilename(chosenCase, filename) {
	return filename
		.split('.')
		.map(chosenCase.fn)
		.join('.');
}

module.exports = function (context) {
	var chosenCase = cases[context.options[0].case || 'camelCase'];

	return {
		Program: function (node) {
			var filenameWithExt = context.getFilename();
			var extension = path.extname(filenameWithExt);
			var filename = path.basename(filenameWithExt, extension);
			var fixedFilename = fixFilename(chosenCase, filename);

			if (fixedFilename !== filename) {
				context.report(node, 'Filename is not in ' + chosenCase.name + '. Rename it to ' + fixedFilename + extension);
			}
		}
	};
};

module.exports.schema = [{
	type: 'object',
	properties: {
		case: {
			enum: ['camelCase', 'snakeCase', 'kebabCase']
		}
	}
}];
