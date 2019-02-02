'use strict';
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const readPkgUp = require('read-pkg-up');
const getDocsUrl = require('./utils/get-docs-url');

const polyfillMap = [
	{
		name: 'built-in extensions›Object static methods›Object.assign',
		original: 'Object.assign',
		polyfills: ['object-assign']
	}
];

function getCompatValues(nodeVersion) {
	const compats = require(`node-compat-table/results/v8/${nodeVersion}`);
	return Object
		.values(compats)
		.reduce((current, val) => {
			if (typeof val !== 'object') {
				return current;
			}

			return Object.assign(current, val);
		}, {});
}

function isRequireCall(node) {
	return node.callee.name === 'require';
}

function getTargetVersion() {
	const pkg = readPkgUp.sync();
	return pkg && pkg.pkg.engines && pkg.pkg.engines.node;
}

function getCompatVersions() {
	const nodeCompatTablePath = path.dirname(require.resolve('node-compat-table/build'));
	return fs
		.readdirSync(
			path.join(nodeCompatTablePath, 'results/v8')
		)
		.map(dir => dir.replace('.json', ''))
		.filter(dir => semver.valid(dir) && !dir.includes('--'))
		.sort(semver.compare);
}

const engineVersion = getTargetVersion();

let version;
let compatValues;

if (engineVersion) {
	version = getCompatVersions().find(item => semver.satisfies(item, engineVersion));
	compatValues = version && getCompatValues(version);
}

function processRule(context, node, moduleName) {
	const polyfill = polyfillMap.find(({polyfills}) => polyfills.includes(moduleName));

	if (polyfill && compatValues[polyfill.name] === true) {
		context.report({
			node,
			message: `Use built in ${polyfill.original}`
		});
	}
}

const create = context => {
	return {
		CallExpression: node => {
			if (compatValues && isRequireCall(node)) {
				const arg0 = node.arguments[0];
				const moduleName = arg0.value;
				processRule(context, node, moduleName);
			}
		},
		ImportDeclaration: node => compatValues && processRule(context, node, node.source.value)
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
