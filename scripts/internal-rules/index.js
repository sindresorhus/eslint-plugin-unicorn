'use strict';

const path = require('node:path');
const pluginName = 'internal-rules';
const TEST_DIRECTORIES = [
	path.join(__dirname, '../../test')
]
const RULES_DIRECTORIES = [
	__dirname,
	path.join(__dirname, '../../rules')
]

const rules = [
	{id: 'fix-snapshot-test', directories: TEST_DIRECTORIES},
	{id: 'prefer-disallow-over-forbid', directories: RULES_DIRECTORIES},
	{id: 'prefer-negative-boolean-attribute', directories: RULES_DIRECTORIES},
];

const isFileInsideDirectory = (filename, directory) => filename.startsWith(directory + path.sep);

module.exports = {
	rules: Object.fromEntries(
		rules.map(({id, directories}) => {
			const rule = require(`./${id}.js`);
			return [
				id,
				{
					...rule,
					create(context) {
						const filename = context.getPhysicalFilename();
						if (directories.every(directory => !isFileInsideDirectory(filename, directory))) {
							return {}
						}

						return rule.create(context);
					}
				}
			];
		})
	),
	configs: {
		all: {
			plugins: [pluginName],
			rules: Object.fromEntries(rules.map(({id}) => [`${pluginName}/${id}`, 'error'])),
		},
	},
};
