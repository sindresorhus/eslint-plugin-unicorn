'use strict';
const semver = require('semver');
const readPkgUp = require('read-pkg-up');
const builtIns = require(`@babel/preset-env/data/built-ins`);
const getDocsUrl = require('./utils/get-docs-url');

const polyfillMap = [
	{
		feature: 'object.assign',
		polyfills: ['object-assign']
	},
	{
		feature: 'array.from',
		polyfills: ['array-from-polyfill']
	}
];

function isRequireCall(node) {
	return node.callee.name === 'require';
}

function getTargetVersion() {
	const pkg = readPkgUp.sync();
	return pkg && pkg.pkg.engines && pkg.pkg.engines.node;
}

const targetVersion = getTargetVersion();
const compatTable = Object.keys(builtIns).reduce((current, feature) => ({
	...current,
	[feature.split('.').slice(1).join('.')]: builtIns[feature],
}), {});

function processRule(context, node, moduleName) {
	const polyfill = polyfillMap.find(({polyfills}) => polyfills.includes(moduleName));

	if (polyfill) {
		const feature = compatTable[polyfill.feature];
		const supportedNodeVersion = feature.node;

		if (semver.satisfies(semver.coerce(supportedNodeVersion), targetVersion)) {
			context.report({
				node,
				message: `Use built in ${polyfill.feature}`
			});
		}
	}
}

const create = context => {
	return {
		CallExpression: node => {
			if (targetVersion && isRequireCall(node)) {
				const arg0 = node.arguments[0];
				const moduleName = arg0.value;
				processRule(context, node, moduleName);
			}
		},
		ImportDeclaration: node => targetVersion && processRule(context, node, node.source.value)
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		}
	}
};
