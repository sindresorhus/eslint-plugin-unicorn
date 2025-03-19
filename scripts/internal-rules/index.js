import {fileURLToPath} from 'node:url';
import fixSnapshotTest from './fix-snapshot-test.js';
import noTestOnly from './no-test-only.js';
import preferNegativeBooleanAttribute from './prefer-negative-boolean-attribute.js';
import preferFixerRemoveRange from './prefer-fixer-remove-range.js';
import noRestrictedPropertyAccess from './no-restricted-property-access.js';

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
	{id: 'no-restricted-property-access', directories: RULES_DIRECTORIES, rule: noRestrictedPropertyAccess},
];

const isFileInsideDirectory = (filename, directory) => filename.startsWith(directory);

const plugin = {
	meta: {
		name: pluginName,
		version: '1.0.0',
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

const config = {
	plugins: {[pluginName]: plugin},
	rules: Object.fromEntries(rules.map(({id}) => [`${pluginName}/${id}`, 'error'])),
};

export default config;
