/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-useless-re-export';
const messages = {
	[MESSAGE_ID]: 'This export is redundant because the same module is already exported with `export *`.',
};

const getName = node => node.type === 'Identifier' ? node.name : node.value;

function getModuleRequest(declaration, sourceCode) {
	const attributes = declaration.attributes ?? [];
	return `${declaration.source.value}\u0000${attributes.map(attribute => sourceCode.getText(attribute)).join('\u0000')}`;
}

function isTypeExport(specifier, declaration) {
	return specifier.exportKind === 'type' || declaration.exportKind === 'type';
}

function isCoveredByWildcard(wildcard, name, typeExport) {
	return name !== 'default'
		&& (wildcard.node.exportKind !== 'type' || typeExport);
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const wildcards = [];
	const exportDeclarations = [];

	context.on('ExportAllDeclaration', declaration => {
		if (!declaration.exported) {
			wildcards.push({
				node: declaration,
				request: getModuleRequest(declaration, sourceCode),
			});
		}
	});

	context.on('ExportNamedDeclaration', declaration => {
		if (declaration.source) {
			exportDeclarations.push(declaration);
		}
	});

	const getRedundantExportProblem = (declaration, specifier) => {
		const exportedName = getName(specifier.exported);
		if (exportedName === 'default') {
			return;
		}

		const importedName = getName(specifier.local);
		const [localStart] = sourceCode.getRange(specifier.local);
		const [exportedStart] = sourceCode.getRange(specifier.exported);
		if (importedName === exportedName && localStart !== exportedStart) {
			return;
		}

		const typeExport = isTypeExport(specifier, declaration);
		const request = getModuleRequest(declaration, sourceCode);

		if (
			importedName === exportedName
			&& wildcards.some(wildcard =>
				wildcard.request === request
				&& isCoveredByWildcard(wildcard, exportedName, typeExport))
		) {
			return {
				node: specifier,
				messageId: MESSAGE_ID,
			};
		}
	};

	context.on('Program:exit', function * () {
		const wildcardRequests = new Set(wildcards.map(wildcard => wildcard.request));

		if (wildcardRequests.size === 1) {
			for (const declaration of exportDeclarations) {
				for (const specifier of declaration.specifiers) {
					const problem = getRedundantExportProblem(declaration, specifier);
					if (problem) {
						yield problem;
					}
				}
			}
		}
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow redundant re-exports.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
