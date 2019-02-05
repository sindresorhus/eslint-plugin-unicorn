'use strict';
const semver = require('semver');
const readPkgUp = require('read-pkg-up');
const builtIns = require('@babel/preset-env/data/built-ins');
const getDocsUrl = require('./utils/get-docs-url');

function isRequireCall(node) {
	return node.callee.name === 'require';
}

function getVersionFromPkg(cwd) {
	const pkg = readPkgUp.sync({cwd});
	return pkg && pkg.pkg.engines && pkg.pkg.engines.node;
}

const compatTable = Object.keys(builtIns).reduce((current, feature) =>
	Object.assign(current, {[feature.split('.').slice(1).join('.')]: builtIns[feature]})
, {});

function isValidVersion(version) {
	return /^[\d.]+$/.test(version.trim());
}

const polyfillMap = Object.keys(compatTable).reduce((current, name) => {
	const polyfills = [];
	const parts = name.split('.');
	const allParts = name.split(/[.-]/);

	function dotted(parts) {
		return parts.join('.');
	}

	function dashed(parts) {
		return parts.join('-');
	}

	function joined(parts) {
		return parts.join('');
	}

	function addPrototype(parts) {
		const clone = parts.slice();
		clone.splice(1, 0, 'prototype');
		return clone;
	}

	function allVariants(parts) {
		return [
			dotted(parts),
			joined(parts),
			dashed(parts),
			dotted(addPrototype(parts)),
			dashed(addPrototype(parts)),
			joined(addPrototype(parts))
		];
	}

	polyfills.push(name);

	polyfills.push(...allVariants(parts));
	polyfills.push(...allVariants(allParts));

	polyfills.push(`mdn-polyfills/${dotted(addPrototype(parts))}`);
	polyfills.push(`${dashed(parts)}-polyfill`);
	polyfills.push(`polyfill-${dashed(parts)}`);

	current.push({
		feature: name,
		polyfills
	});

	return current;
}, []);

function processRule(context, node, moduleName, targetVersion) {
	const polyfill = polyfillMap.find(({polyfills}) => polyfills.includes(moduleName));

	if (polyfill) {
		const feature = compatTable[polyfill.feature];
		const supportedNodeVersion = semver.valid(semver.coerce(feature.node));
		const validRangeTargetVersion = semver.validRange(targetVersion).replace('=', '');
		const validTargetVersion = isValidVersion(targetVersion) && semver.valid(semver.coerce(targetVersion));

		if (validTargetVersion) {
			if (semver.lte(supportedNodeVersion, validTargetVersion)) {
				context.report({
					node,
					message: `Use built in ${polyfill.feature}`
				});
			}
		} else if (semver.ltr(supportedNodeVersion, validRangeTargetVersion)) {
			context.report({
				node,
				message: `Use built in ${polyfill.feature}`
			});
		}
	}
}

const create = context => {
	const options = context.options[0];
	const targetVersion = (options && options.targetVersion) || getVersionFromPkg(context.getFilename());
	return {
		CallExpression: node => {
			if (targetVersion && isRequireCall(node)) {
				const arg0 = node.arguments[0];
				const moduleName = arg0.value;
				processRule(context, node, moduleName, targetVersion);
			}
		},
		ImportDeclaration: node => targetVersion && processRule(context, node, node.source.value, targetVersion)
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
