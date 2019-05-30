'use strict';
const readPkg = require('read-pkg');
const semver = require('semver');
const getDocsUrl = require('./utils/get-docs-url');

const pkg = readPkg.sync();

const pkgDependencies = {...pkg.dependencies, ...pkg.devDependencies};

const TODO_RE = /[TODO|FIXME]\s*\[([^}]+)\]/i;
const DEPENDENCY_INCLUSION_RE = /^[+|-]\s*@?[\S+]\/?\S+/;
const DEPENDENCY_VERSION_RE = /^(@?[\S+]\/?\S+)@(>|>=)([\d]+(\.\d+){0,2})/;
const PKG_VERSION_RE = /^(>|>=)([\d]+(\.\d+){0,2})\s*$/;
const ISO8601 = /(\d{4})-(\d{2})-(\d{2})/;

const create = context => {
	const sourceCode = context.getSourceCode();

	function processComment(comment) {
		const parsed = parseTodoWithArgs(comment.value);

		if (!parsed) {
			return false;
		}

		const {
			packageVersions = [],
			dates = [],
			dependencies = []
		} = parsed;

		if (dates.length > 1) {
			context.report({
				node: null,
				loc: comment.loc,
				messageId: 'avoidMultipleDates',
				data: {
					expirationDates: dates.join(', ')
				}
			});
		} else if (dates.length === 1) {
			const [date] = dates;

			if (reachedDate(date)) {
				context.report({
					node: null,
					loc: comment.loc,
					messageId: 'expiredTodo',
					data: {
						expirationDate: date
					}
				});
			}
		}

		if (packageVersions.length > 1) {
			context.report({
				node: null,
				loc: comment.loc,
				messageId: 'avoidMultiplePackageVersions',
				data: {
					versions: packageVersions.map(({condition, version}) => `${condition} ${version}`).join(', ')
				}
			});
		} else if (packageVersions.length === 1) {
			const [{condition, version}] = packageVersions;

			const pkgVersion = tryToCoerceVersion(pkg.version);
			const desidedPkgVersion = tryToCoerceVersion(version);

			const compare = semverComparisonForOperator(condition);

			if (compare(pkgVersion, desidedPkgVersion)) {
				context.report({
					node: null,
					loc: comment.loc,
					messageId: 'reachedPackageVersion',
					data: {
						comparison: `${condition} ${version}`
					}
				});
			}
		}

		// Inclusion: 'in', 'out'
		// Comparison: '>', '>='
		for (const dependency of dependencies) {
			const targetPackageRawVersion = pkgDependencies[dependency.name];
			const hasTargetPackage = Boolean(targetPackageRawVersion);

			const isInclusion = ['in', 'out'].includes(dependency.condition);
			if (isInclusion) {
				const [trigger, messageId] = dependency.condition === 'in' ?
					[hasTargetPackage, 'havePackage'] :
					[!hasTargetPackage, 'dontHavePackage'];

				if (trigger) {
					context.report({
						node: null,
						loc: comment.loc,
						messageId,
						data: {
							package: dependency.name
						}
					});
				}

				continue;
			}

			const todoVersion = tryToCoerceVersion(dependency.version);
			const targetPackageVersion = tryToCoerceVersion(targetPackageRawVersion);

			if (!hasTargetPackage || !targetPackageVersion) {
				// Can't compare ¯\_(ツ)_/¯
				continue;
			}

			const compare = semverComparisonForOperator(dependency.condition);

			if (compare(targetPackageVersion, todoVersion)) {
				context.report({
					node: null,
					loc: comment.loc,
					messageId: 'versionMatches',
					data: {
						comparison: `${dependency.name} ${dependency.condition} ${dependency.version}`
					}
				});
			}
		}
	}

	return {
		Program() {
			const comments = sourceCode.getAllComments();
			comments.filter(token => token.type !== 'Shebang').forEach(processComment);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		messages: {
			avoidMultipleDates: 'Avoid using multiple expiration dates for TODO {{ expirationDates }}',
			expiredTodo: 'You have a TODO that past due date {{ expirationDate }}',
			reachedPackageVersion: 'You have a TODO that past due package version {{ comparison }}',
			avoidMultiplePackageVersions: 'Avoid asking multiple package versions for TODO {{ versions }}',
			havePackage: 'You have a TODO that is deprecated since you installed {{ package }}',
			dontHavePackage: 'You have a TODO that is deprecated since you uninstalled {{ package }}',
			versionMatches: 'You have a TODO matches version for package {{ comparison }}'
		}
	}
};

function parseTodoWithArgs(str) {
	const result = TODO_RE.exec(str);

	if (!result) {
		return false;
	}

	const rawArgs = result[1];

	return rawArgs
		.split(',')
		.map(arg => parseArg(arg.trim()))
		.reduce((groups, arg) => {
			if (!groups[arg.type]) {
				groups[arg.type] = [];
			}

			groups[arg.type].push(arg.value);
			return groups;
		}, {});
}

function parseArg(argString) {
	if (ISO8601.test(argString)) {
		return {
			type: 'dates',
			value: argString
		};
	}

	if (DEPENDENCY_INCLUSION_RE.test(argString)) {
		const condition = argString[0] === '+' ? 'in' : 'out';
		const name = argString.substring(1).trim();

		return {
			type: 'dependencies',
			value: {
				name,
				condition
			}
		};
	}

	if (DEPENDENCY_VERSION_RE.test(argString)) {
		const result = DEPENDENCY_VERSION_RE.exec(argString);
		const name = result[1].trim();
		const condition = result[2].trim();
		const version = result[3].trim();

		return {
			type: 'dependencies',
			value: {
				name,
				condition,
				version
			}
		};
	}

	if (PKG_VERSION_RE.test(argString)) {
		const result = PKG_VERSION_RE.exec(argString);
		const condition = result[1].trim();
		const version = result[2].trim();

		return {
			type: 'packageVersions',
			value: {
				condition,
				version
			}
		};
	}

	// Currently being ignored as integration tests pointed
	// some TODO comments have [random data like this]
	return {
		type: 'unknowns',
		value: argString
	};
}

function reachedDate(past) {
	const now = (new Date()).toISOString().substring(0, 10);
	return Date.parse(past) < Date.parse(now);
}

function tryToCoerceVersion(version) {
	try {
		return semver.coerce(version);
	} catch (error) {
		return false;
	}
}

function semverComparisonForOperator(operator) {
	return ({
		'>': semver.gt,
		'>=': semver.gte
	})[operator];
}
