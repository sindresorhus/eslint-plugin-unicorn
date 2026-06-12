import path from 'node:path';
import browserslist from 'browserslist';
import coreJsCompat from 'core-js-compat';
import {camelCase} from 'change-case';
import isStaticRequire from './ast/is-static-require.js';
import {readPackageJson} from './shared/package-json.js';

// `core-js-compat` can be exposed directly or under `.default`, depending on module interop.
const {data: compatData, entries: coreJsEntries} = coreJsCompat.default ?? coreJsCompat;

const MESSAGE_ID_POLYFILL = 'unnecessaryPolyfill';
const MESSAGE_ID_CORE_JS = 'unnecessaryCoreJsModule';
const messages = {
	[MESSAGE_ID_POLYFILL]: 'Use built-in instead.',
	[MESSAGE_ID_CORE_JS]:
		'All polyfilled features imported from `{{coreJsModule}}` are available as built-ins. Use the built-ins instead.',
};

const additionalPolyfillModules = {
	'es.promise.finally': ['p-finally'],
	'es.object.set-prototype-of': ['setprototypeof'],
	'es.string.code-point-at': ['code-point-at'],
};
const directFeatureCheckPolyfills = new Set([
	'es6-symbol',
	'promise-polyfill',
	'es6-promise',
	'weakmap-polyfill',
]);
const unavailableFeatureSetByTargets = new Map();
const additionalPolyfillPatterns = Object.fromEntries(Object.entries(additionalPolyfillModules).map(([feature, modules]) => [feature, `|(${modules.join('|')})`]));

const prefixes = '(mdn-polyfills/|polyfill-)';
const suffixes = '(-polyfill)';
const delimiter = String.raw`(\.|-|\.prototype\.|/)?`;
const moduleDelimiter = /[-./]/;

const getFirstSegment = value => {
	const [firstSegment = ''] = value.split(moduleDelimiter);
	return firstSegment;
};

const stripPolyfillPrefix = value => {
	if (value.startsWith('polyfill-')) {
		return value.slice('polyfill-'.length);
	}

	if (value.startsWith('mdn-polyfills/')) {
		return value.slice('mdn-polyfills/'.length);
	}

	return value;
};

function addPolyfillToken(tokens, value) {
	if (!value) {
		return;
	}

	const lowercaseValue = value.toLowerCase();
	tokens.add(lowercaseValue);
	tokens.add(getFirstSegment(lowercaseValue));

	const camelCasedValue = camelCase(value).toLowerCase();
	tokens.add(camelCasedValue);
	tokens.add(getFirstSegment(camelCasedValue));
}

const polyfills = Object.keys(compatData).map(feature => {
	const [rawEcmaVersion, rawConstructorName, rawMethodName = ''] = feature.split('.');
	let ecmaVersion = rawEcmaVersion;
	let constructorName = rawConstructorName;
	let methodName = rawMethodName;

	if (ecmaVersion === 'es') {
		ecmaVersion = String.raw`(es\d*)`;
	}

	constructorName = `(${constructorName}|${camelCase(constructorName)})`;
	methodName &&= `(${methodName}|${camelCase(methodName)})`;

	const methodOrConstructor = methodName || constructorName;

	const patterns = [
		`^((${prefixes}?(`,
		methodName && `(${ecmaVersion}${delimiter}${constructorName}${delimiter}${methodName})|`, // Ex: es6-array-copy-within
		methodName && `(${constructorName}${delimiter}${methodName})|`, // Ex: array-copy-within
		`(${ecmaVersion}${delimiter}${constructorName}))`, // Ex: es6-array
		`${suffixes}?)|`,
		`(${prefixes}${methodOrConstructor}|${methodOrConstructor}${suffixes})`, // Ex: polyfill-copy-within / polyfill-promise
		`${additionalPolyfillPatterns[feature] || ''})$`,
	];

	return {
		feature,
		pattern: new RegExp(patterns.join(''), 'iv'),
		tokens: (() => {
			const tokens = new Set();

			if (rawEcmaVersion === 'es') {
				tokens.add('es');
			} else {
				addPolyfillToken(tokens, rawEcmaVersion);
			}

			addPolyfillToken(tokens, rawConstructorName);
			addPolyfillToken(tokens, rawMethodName);

			for (const module of additionalPolyfillModules[feature] || []) {
				addPolyfillToken(tokens, module);
			}

			return tokens;
		})(),
	};
});
const polyfillsByToken = new Map();
const polyfillTokensByFirstCharacter = new Map();
const esConstructorTokens = new Set();

for (const polyfill of polyfills) {
	const [ecmaVersion, constructorName] = polyfill.feature.split('.');
	if (ecmaVersion === 'es') {
		esConstructorTokens.add(constructorName.toLowerCase());
		esConstructorTokens.add(camelCase(constructorName).toLowerCase());
	}

	for (const token of polyfill.tokens) {
		if (!token) {
			continue;
		}

		if (polyfillsByToken.has(token)) {
			polyfillsByToken.get(token).push(polyfill);
		} else {
			polyfillsByToken.set(token, [polyfill]);
		}

		const firstCharacter = token[0];
		if (polyfillTokensByFirstCharacter.has(firstCharacter)) {
			polyfillTokensByFirstCharacter.get(firstCharacter).add(token);
		} else {
			polyfillTokensByFirstCharacter.set(firstCharacter, new Set([token]));
		}
	}
}

const hasEsConstructorPrefix = value => {
	for (const token of esConstructorTokens) {
		if (value.startsWith(token)) {
			return true;
		}
	}

	return false;
};

const isPotentialEsPrefix = importedModule => {
	if (!importedModule.startsWith('es')) {
		return false;
	}

	let constructorIndex = 2;
	while (
		constructorIndex < importedModule.length
		&& importedModule[constructorIndex] >= '0'
		&& importedModule[constructorIndex] <= '9'
	) {
		constructorIndex++;
	}

	if (importedModule.startsWith('.prototype.', constructorIndex)) {
		constructorIndex += '.prototype.'.length;
	} else if (['.', '-', '/'].includes(importedModule[constructorIndex])) {
		constructorIndex++;
	}

	return hasEsConstructorPrefix(importedModule.slice(constructorIndex));
};

const getPolyfillCandidates = importedModule => {
	const normalizedImportedModule = stripPolyfillPrefix(importedModule);
	if (!normalizedImportedModule) {
		return;
	}

	const firstCharacter = normalizedImportedModule[0];
	const tokens = polyfillTokensByFirstCharacter.get(firstCharacter);
	if (!tokens) {
		return;
	}

	const candidates = new Set();
	const firstSegment = getFirstSegment(normalizedImportedModule);
	if (firstSegment === normalizedImportedModule) {
		for (const token of tokens) {
			if (token === 'es') {
				if (!isPotentialEsPrefix(normalizedImportedModule)) {
					continue;
				}
			} else if (!normalizedImportedModule.startsWith(token)) {
				continue;
			}

			for (const polyfill of polyfillsByToken.get(token)) {
				candidates.add(polyfill);
			}
		}
	} else {
		for (const token of tokens) {
			if (
				token === 'es'
				|| !firstSegment.startsWith(token)
			) {
				continue;
			}

			for (const polyfill of polyfillsByToken.get(token)) {
				candidates.add(polyfill);
			}
		}
	}

	if (isPotentialEsPrefix(normalizedImportedModule)) {
		for (const polyfill of polyfillsByToken.get('es') || []) {
			candidates.add(polyfill);
		}
	}

	if (candidates.size === 0) {
		return;
	}

	return [...candidates];
};

export const getBestMatchingPolyfill = (polyfillCandidates, importedModule) => {
	let bestMatch;
	let bestMatchSegments = Infinity;

	for (const polyfill of polyfillCandidates) {
		if (!polyfill.pattern.test(importedModule)) {
			continue;
		}

		// Prefer the broad constructor/module feature over narrower follow-up features like `es.symbol.description`.
		const segments = polyfill.feature.split('.').length;
		if (segments < bestMatchSegments) {
			bestMatch = polyfill;
			bestMatchSegments = segments;
		}
	}

	return bestMatch;
};

function getTargets(options, dirname) {
	const browserslistOptions = {path: dirname, env: 'production'};
	try {
		if (options?.targets) {
			if (typeof options.targets === 'string' || Array.isArray(options.targets)) {
				return browserslist(options.targets, browserslistOptions);
			}

			return options.targets;
		}

		const browserslistConfig = browserslist.loadConfig(browserslistOptions);
		if (browserslistConfig) {
			return browserslist(browserslistConfig, browserslistOptions);
		}
	} catch {
		return;
	}

	const packageJsonResult = readPackageJson(dirname);

	if (!packageJsonResult) {
		return;
	}

	return packageJsonResult.packageJson.engines;
}

function create(context) {
	const targets = getTargets(context.options[0], path.dirname(context.filename));
	if (!targets) {
		return;
	}

	const targetsCacheKey = JSON.stringify(targets);
	let unavailableFeatureSet;
	if (unavailableFeatureSetByTargets.has(targetsCacheKey)) {
		unavailableFeatureSet = unavailableFeatureSetByTargets.get(targetsCacheKey);
	} else {
		try {
			unavailableFeatureSet = new Set(coreJsCompat({targets}).list);
		} catch {
			// This can happen if the targets are invalid or use unsupported syntax like `{node:'*'}`.
		}

		unavailableFeatureSetByTargets.set(targetsCacheKey, unavailableFeatureSet);
	}

	if (!unavailableFeatureSet) {
		return;
	}

	// When core-js graduates a feature from `esnext` to `es`, the entries list both (e.g. `['es.regexp.escape', 'esnext.regexp.escape']`),
	// but `coreJsCompat` only includes the `es` version in its unavailable list, making the `esnext` version appear "available".
	// To avoid false positives, treat `esnext.*` features as unavailable when their `es.*` counterpart is already in the list.
	const areFeaturesAvailable = features => features.every(feature =>
		!unavailableFeatureSet.has(feature)
		|| (feature.startsWith('esnext.') && features.includes(feature.replace('esnext.', 'es.'))));

	context.on('Literal', node => {
		if (
			!(
				(['ImportDeclaration', 'ImportExpression'].includes(node.parent.type) && node.parent.source === node)
				|| (isStaticRequire(node.parent) && node.parent.arguments[0] === node)
			)
		) {
			return;
		}

		const importedModule = node.value;
		if (typeof importedModule !== 'string' || ['.', '/'].includes(importedModule[0])) {
			return;
		}

		const coreJsModuleFeatures = coreJsEntries[importedModule.replace('core-js-pure', 'core-js')];

		if (coreJsModuleFeatures) {
			if (coreJsModuleFeatures.length > 1) {
				if (areFeaturesAvailable(coreJsModuleFeatures)) {
					return {
						node,
						messageId: MESSAGE_ID_CORE_JS,
						data: {
							coreJsModule: importedModule,
						},
					};
				}
			} else if (!unavailableFeatureSet.has(coreJsModuleFeatures[0])) {
				return {node, messageId: MESSAGE_ID_POLYFILL};
			}

			return;
		}

		const normalizedImportedModule = importedModule.toLowerCase();
		const polyfillCandidates = getPolyfillCandidates(normalizedImportedModule);
		if (!polyfillCandidates) {
			return;
		}

		const polyfill = getBestMatchingPolyfill(polyfillCandidates, importedModule);
		if (!polyfill) {
			return;
		}

		if (directFeatureCheckPolyfills.has(normalizedImportedModule)) {
			// These legacy aliases target one built-in feature, while the matching `core-js/full/*`
			// module now bundles extra `esnext` features that can still be unavailable in CI.
			if (!unavailableFeatureSet.has(polyfill.feature)) {
				return {node, messageId: MESSAGE_ID_POLYFILL};
			}

			return;
		}

		const [, namespace, method = ''] = polyfill.feature.split('.');
		const matchedCoreJsModuleFeatures = coreJsEntries[`core-js/full/${namespace}${method && '/'}${method}`];
		if (matchedCoreJsModuleFeatures && areFeaturesAvailable(matchedCoreJsModuleFeatures)) {
			return {node, messageId: MESSAGE_ID_POLYFILL};
		}
	});
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		// `targets` is optional because the rule can fall back to Browserslist config discovery or package.json `engines`.
		properties: {
			targets: {
				oneOf: [
					{
						type: 'string',
						description: 'A browserslist query string.',
					},
					{
						type: 'array',
						description: 'An array of browserslist query strings.',
					},
					{
						type: 'object',
						description: 'A browserslist targets object.',
					},
				],
				description: 'The target environments.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the use of built-in methods instead of unnecessary polyfills.',
			recommended: 'unopinionated',
		},
		schema,
		defaultOptions: [{}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
