import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import packageJson from './package.json' with {type: 'json'};

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pluginName = 'internal';

const TEST_DIRECTORIES = [
	path.join(__dirname, '../../test'),
];

const RULES_DIRECTORIES = [
	path.join(__dirname, '../../rules'),
];

const rules = [
	{id: 'fix-snapshot-test', directories: TEST_DIRECTORIES},
	{id: 'prefer-negative-boolean-attribute', directories: RULES_DIRECTORIES},
	{id: 'no-test-only', directories: TEST_DIRECTORIES},
];

const isFileInsideDirectory = (filename, directory) => filename.startsWith(directory + path.sep);

const internal = {
	meta: {
		name: packageJson.name,
		version: packageJson.version,
	},
	rules: Object.fromEntries(
		rules.map(({id, directories}) => {
			const {default: rule} = require(`./${id}.js`);

			return [
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
			];
		}),
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
