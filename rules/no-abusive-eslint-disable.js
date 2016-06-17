'use strict';

var disableRegex = /^eslint-disable(-next-line|-line)?($|(\s+([\w-]+))?)/;

module.exports = function (context) {
	return {
		Program: function (node) {
			node.comments.forEach(function (comment) {
				var value = comment.value.trim();
				var res = disableRegex.exec(value);

				if (res && // It is a eslint-disable comment
					!res[2] // but it did not specify any rules
				) {
					context.report({
						// Can't set it at the given location as the warning
						// will be ignored due to the disable comment
						loc: {
							line: 0,
							column: 0
						},
						// So specify it in the message
						message: 'Specify the rules you want to disable at line {{line}}:{{column}}',
						data: comment.loc.start
					});
				}
			});
		}
	};
};
