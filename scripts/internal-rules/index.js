import {fileURLToPath} from 'node:url';
import packageJson from './package.json' with {type: 'json'};
import fixSnapshotTest from './fix-snapshot-test.js';
import noTestOnly from './no-test-only.js';
import preferNegativeBooleanAttribute from './prefer-negative-boolean-attribute.js';
import preferFixerRemoveRange from './prefer-fixer-remove-range.js';

const pluginName = 'internal';

const TEST_DIRECTORIES = [
	new URL('../../test/', import.meta.url),
].map(url => fileURLToPath(url));

const RULES_DIRECTORIES = [
	new URL('../../rules/', import.meta.url),
].map(url => fileURLToPath(url));

const rules = [
	{id: 'fix-snapshot-test', directories: TEST_DIRECTORIES, rule: fixSnapshotTest},
	{id: 'prefer-negative-boolean-attribute', directories: RULES_DIRECTORIES, rule: preferNegativeBooleanAttribute},
	{id: 'no-test-only', directories: TEST_DIRECTORIES, rule: noTestOnly},
	{id: 'prefer-fixer-remove-range', directories: RULES_DIRECTORIES, rule: preferFixerRemoveRange},
];

const isFileInsideDirectory = (filename, directory) => filename.startsWith(directory);

const internal = {
	meta: {
		name: packageJson.name,
		version: packageJson.version,
	},
	rules: Object.fromEntries(
		rules.map(({id, directories, rule}) => [
			id,
			{
				...rule,
				create(context) {
					const filename = context.physicalFilename;
					if (directories.every(directory => !isFileInsideDirectory(filename, directory))) {
						return {};
					}

					return rule.create(context);
				},
			},
		]),
	),
};

const configs = {
	all: {
		plugins: {
			internal,
		},
		rules: Object.fromEntries(rules.map(({id}) => [`${pluginName}/${id}`, 'error'])),
	},
};

const allConfigs = {
	...internal,
	configs,
};

export default allConfigs;
