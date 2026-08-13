// `eslint-package-json` does not export its AST helpers, so keep this lookup local to the two project-only rules.
const getMember = (object, key) => {
	if (object?.type !== 'Object') {
		return;
	}

	return object.members.findLast(member => member.name.value === key);
};

const compareStrings = (first, second) => {
	if (first < second) {
		return -1;
	}

	if (first > second) {
		return 1;
	}

	return 0;
};

const packageJsonPlugin = {
	meta: {
		name: 'eslint-plugin-internal-package-json',
		version: '1.0.0',
	},
	rules: {
		'require-scripts': {
			meta: {
				type: 'suggestion',
				docs: {
					description: 'Require project scripts to be defined.',
				},
				messages: {
					missing: 'The `{{script}}` script is required.',
				},
				schema: [],
				languages: ['json/json'],
			},
			create: context => ({
				Document(document) {
					const root = document.body;
					const scripts = getMember(root, 'scripts');
					if (!scripts) {
						return;
					}

					for (const script of ['lint', 'test']) {
						if (getMember(scripts?.value, script)) {
							continue;
						}

						context.report({
							node: scripts?.value ?? root,
							messageId: 'missing',
							data: {script},
						});
					}
				},
			}),
		},
		'sort-bundled-dependencies': {
			meta: {
				type: 'suggestion',
				docs: {
					description: 'Enforce alphabetical ordering of bundled dependencies.',
				},
				messages: {
					sort: '`bundledDependencies` should be sorted alphabetically.',
				},
				schema: [],
				languages: ['json/json'],
			},
			create: context => ({
				Document(document) {
					const bundledDependencies = getMember(document.body, 'bundledDependencies')?.value;

					if (bundledDependencies?.type !== 'Array') {
						return;
					}

					const dependencies = bundledDependencies.elements.map(element => element.value);
					if (dependencies.some(dependency => dependency.type !== 'String')) {
						return;
					}

					const sortedDependencies = dependencies.map(dependency => dependency.value).toSorted(compareStrings);
					if (dependencies.every((dependency, index) => dependency.value === sortedDependencies[index])) {
						return;
					}

					context.report({
						node: bundledDependencies,
						messageId: 'sort',
					});
				},
			}),
		},
	},
};

const config = {
	files: ['**/package.json'],
	plugins: {
		'internal-package-json': packageJsonPlugin,
	},
	rules: {
		'internal-package-json/require-scripts': 'error',
		'internal-package-json/sort-bundled-dependencies': 'error',
	},
};

export default config;
