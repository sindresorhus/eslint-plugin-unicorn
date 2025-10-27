import {fileURLToPath} from 'node:url';
import fixSnapshotTest from './fix-snapshot-test.js';
import noTestOnly from './no-test-only.js';
import preferNegativeBooleanAttribute from './prefer-negative-boolean-attribute.js';
import preferFixerRemoveRange from './prefer-fixer-remove-range.js';
import preferContextOn from './prefer-context-on.js';
import noRestrictedPropertyAccess from './no-restricted-property-access.js';
import noSourceCodeParameter from './no-source-code-parameter.js';
import noFixYieldStar from './no-fix-yield-star.js';

const pluginName = 'internal';
const PROJECT_ROOT = new URL('../../', import.meta.url);

const TEST_DIRECTORIES = [
	'test',
];

const RULES_DIRECTORIES = [
	'rules',
];

const UTILITIES_DIRECTORIES = [
	'rules/ast',
	'rules/shared',
	'rules/utils',
	'rules/fix',
];

const rules = [
	{id: 'fix-snapshot-test', directories: TEST_DIRECTORIES, rule: fixSnapshotTest},
	{id: 'prefer-negative-boolean-attribute', directories: RULES_DIRECTORIES, rule: preferNegativeBooleanAttribute},
	{id: 'no-test-only', directories: TEST_DIRECTORIES, rule: noTestOnly},
	{id: 'prefer-fixer-remove-range', directories: RULES_DIRECTORIES, rule: preferFixerRemoveRange},
	{id: 'no-restricted-property-access', directories: RULES_DIRECTORIES, rule: noRestrictedPropertyAccess},
	{id: 'no-source-code-parameter', directories: UTILITIES_DIRECTORIES, rule: noSourceCodeParameter},
	{id: 'prefer-context-on', directories: RULES_DIRECTORIES, rule: preferContextOn},
	{id: 'no-fix-yield-star', directories: RULES_DIRECTORIES, rule: noFixYieldStar},
];

const createFilePredicate = directories => {
	directories = directories.map(directory => fileURLToPath(new URL(`${directory}/`, PROJECT_ROOT)));
	return filename => directories.some(directory => filename.startsWith(directory));
};

const plugin = {
	meta: {
		name: pluginName,
		version: '1.0.0',
	},
	rules: Object.fromEntries(
		rules.map(({id, directories, rule}) => {
			const isFileInsideDirectories = createFilePredicate(directories);
			return [
				id,
				{
					...rule,
					create: context =>
						isFileInsideDirectories(context.physicalFilename) ? rule.create(context) : {},
				},
			];
		}),
	),
};

const config = {
	plugins: {[pluginName]: plugin},
	rules: Object.fromEntries(rules.map(({id}) => [`${pluginName}/${id}`, 'error'])),
};

export default config;
