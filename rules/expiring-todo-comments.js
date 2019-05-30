'use strict';
const readPkg = require('read-pkg');
const semver = require('semver');
const ci = require('ci-info');
const baseRule = require('eslint/lib/rules/no-warning-comments');
const getDocsUrl = require('./utils/get-docs-url');

const pkg = readPkg.sync();

const pkgDependencies = {...pkg.dependencies, ...pkg.devDependencies};

const DEPENDENCY_INCLUSION_RE = /^[+|-]\s*@?[\S+]\/?\S+/;
const DEPENDENCY_VERSION_RE = /^(@?[\S+]\/?\S+)@(>|>=)([\d]+(\.\d+){0,2})/;
const PKG_VERSION_RE = /^(>|>=)([\d]+(\.\d+){0,2})\s*$/;
const ENGINES_RE = /^engines (\S+)(>|>=)([\d]+(\.\d+){0,2})/;
const ISO8601 = /(\d{4})-(\d{2})-(\d{2})/;

const create = context => {
	const options = {
		terms: ['todo', 'fixme', 'xxx'],
		ignoreDatesOnPR: true,
		...context.options[0]
	};

	const sourceCode = context.getSourceCode();
	const comments = sourceCode.getAllComments();
	const unnusedComments = comments
		.filter(token => token.type !== 'Shebang')
		.filter(processComment);

	// This is highly dependable on eslint's no-warning-comments implementation.
	// What I do is patch the parts I know the rule will use, the getAllComments.
	// Since I have priority, I leave only the comments that I didn't use to it.
	const fakeContext = {...context, getSourceCode() {
		return {...sourceCode, getAllComments() {
			return unnusedComments;
		}};
	}};
	const rules = baseRule.create(fakeContext);

	function processComment(comment) {
		const parsed = parseTodoWithArgs(comment.value, options);

		if (!parsed) {
			return true;
		}

		// Count if there where valid props
		// Otherwise it's a useless TODO (fallback to no-warning-comments)
		let uses = 0;

		const {
			packageVersions = [],
			dates = [],
			dependencies = [],
			engines = []
		} = parsed;

		if (dates.length > 1) {
			uses++;
			context.report({
				node: null,
				loc: comment.loc,
				messageId: 'avoidMultipleDates',
				data: {
					expirationDates: dates.join(', ')
				}
			});
		} else if (dates.length === 1) {
			uses++;
			const [date] = dates;

			const shouldIgnore = options.ignoreDatesOnPR && ci.isPR;
			if (!shouldIgnore && reachedDate(date)) {
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
			uses++;
			context.report({
				node: null,
				loc: comment.loc,
				messageId: 'avoidMultiplePackageVersions',
				data: {
					versions: packageVersions.map(({condition, version}) => `${condition} ${version}`).join(', ')
				}
			});
		} else if (packageVersions.length === 1) {
			uses++;
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
			uses++;
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

		const pkgEngines = pkg.engines || {};

		for (const engine of engines) {
			uses++;
			const targetPackageRawEngineVersion = pkgEngines[engine.name];
			const hasTargetEngine = Boolean(targetPackageRawEngineVersion);

			if (!hasTargetEngine) {
				continue;
			}

			const todoEngine = tryToCoerceVersion(engine.version);
			const targetPackageEngineVersion = tryToCoerceVersion(targetPackageRawEngineVersion);

			const compare = semverComparisonForOperator(engine.condition);

			if (compare(targetPackageEngineVersion, todoEngine)) {
				context.report({
					node: null,
					loc: comment.loc,
					messageId: 'engineMatches',
					data: {
						comparison: `${engine.name} ${engine.condition} ${engine.version}`
					}
				});
			}
		}

		return uses === 0;
	}

	return {
		Program() {
			rules.Program(); // eslint-disable-line new-cap
		}
	};
};

const schema = [{
	type: 'object',
	properties: {
		terms: {
			type: 'array',
			items: {
				type: 'string'
			}
		},

		ignoreDatesOnPR: {
			type: 'boolean'
		}
	}
}];

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
			versionMatches: 'You have a TODO match for version for package {{ comparison }}',
			engineMatches: 'You have a TODO match for engine version {{ comparison }}'
		},
		schema
	}
};

function parseTodoWithArgs(str, {terms}) {
	const TODO_RE = new RegExp(`[${terms.join('|')}][\\s\\S]*\\[([^}]+)\\]`, 'i');
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

	if (ENGINES_RE.test(argString)) {
		const result = ENGINES_RE.exec(argString);
		const name = result[1].trim();
		const condition = result[2].trim();
		const version = result[3].trim();

		return {
			type: 'engines',
			value: {
				name,
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
