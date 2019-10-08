'use strict';
const readPkgUp = require('read-pkg-up');
const semver = require('semver');
const ci = require('ci-info');
const baseRule = require('eslint/lib/rules/no-warning-comments');
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID_AVOID_MULTIPLE_DATES = 'avoidMultipleDates';
const MESSAGE_ID_EXPIRED_TODO = 'expiredTodo';
const MESSAGE_ID_AVOID_MULTIPLE_PACKAGE_VERSIONS =
	'avoidMultiplePackageVersions';
const MESSAGE_ID_REACHED_PACKAGE_VERSION = 'reachedPackageVersion';
const MESSAGE_ID_HAVE_PACKAGE = 'havePackage';
const MESSAGE_ID_DONT_HAVE_PACKAGE = 'dontHavePackage';
const MESSAGE_ID_VERSION_MATCHES = 'versionMatches';
const MESSAGE_ID_ENGINE_MATCHES = 'engineMatches';
const MESSAGE_ID_REMOVE_WHITESPACES = 'removeWhitespaces';
const MESSAGE_ID_MISSING_AT_SYMBOL = 'missingAtSymbol';

const packageResult = readPkgUp.sync();
const hasPackage = Boolean(packageResult);
const packageJson = hasPackage ? packageResult.packageJson : {};

const pkgDependencies = {
	...packageJson.dependencies,
	...packageJson.devDependencies
};

const DEPENDENCY_INCLUSION_RE = /^[+|-]\s*@?[\S+]\/?\S+/;
const VERSION_COMPARISON_RE = /^(@?[\S+]\/?\S+)@(>|>=)([\d]+(\.\d+){0,2})/;
const PKG_VERSION_RE = /^(>|>=)([\d]+(\.\d+){0,2})\s*$/;
const ISO8601_DATE = /(\d{4})-(\d{2})-(\d{2})/;

function parseTodoWithArguments(string, {terms}) {
	const lowerCaseString = string.toLowerCase();
	const lowerCaseTerms = terms.map(term => term.toLowerCase());
	const hasTerm = lowerCaseTerms.some(term => lowerCaseString.includes(term));

	if (!hasTerm) {
		return false;
	}

	const TODO_ARGUMENT_RE = /\[([^}]+)\]/i;
	const result = TODO_ARGUMENT_RE.exec(string);

	if (!result) {
		return false;
	}

	const rawArguments = result[1];

	return rawArguments
		.split(',')
		.map(argument => parseArgument(argument.trim()))
		.reduce((groups, argument) => {
			if (!groups[argument.type]) {
				groups[argument.type] = [];
			}

			groups[argument.type].push(argument.value);
			return groups;
		}, {});
}

function parseArgument(argumentString) {
	if (ISO8601_DATE.test(argumentString)) {
		return {
			type: 'dates',
			value: argumentString
		};
	}

	if (hasPackage && DEPENDENCY_INCLUSION_RE.test(argumentString)) {
		const condition = argumentString[0] === '+' ? 'in' : 'out';
		const name = argumentString.slice(1).trim();

		return {
			type: 'dependencies',
			value: {
				name,
				condition
			}
		};
	}

	if (hasPackage && VERSION_COMPARISON_RE.test(argumentString)) {
		const result = VERSION_COMPARISON_RE.exec(argumentString);
		const name = result[1].trim();
		const condition = result[2].trim();
		const version = result[3].trim();

		const hasEngineKeyword = name.indexOf('engine:') === 0;
		const isNodeEngine = hasEngineKeyword && name === 'engine:node';

		if (hasEngineKeyword && isNodeEngine) {
			return {
				type: 'engines',
				value: {
					condition,
					version
				}
			};
		}

		if (!hasEngineKeyword) {
			return {
				type: 'dependencies',
				value: {
					name,
					condition,
					version
				}
			};
		}
	}

	if (hasPackage && PKG_VERSION_RE.test(argumentString)) {
		const result = PKG_VERSION_RE.exec(argumentString);
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
	// some TODO comments have `[random data like this]`
	return {
		type: 'unknowns',
		value: argumentString
	};
}

function parseTodoMessage(todoString) {
	// @example "TODO [...]: message here"
	// @example "TODO [...] message here"
	const argumentsEnd = todoString.indexOf(']');

	const afterArguments = todoString.slice(argumentsEnd + 1).trim();

	// Check if have to skip colon
	// @example "TODO [...]: message here"
	const dropColon = afterArguments[0] === ':';
	if (dropColon) {
		return afterArguments.slice(1).trim();
	}

	return afterArguments;
}

function reachedDate(past) {
	const now = new Date().toISOString().slice(0, 10);
	return Date.parse(past) < Date.parse(now);
}

function tryToCoerceVersion(version) {
	try {
		return semver.coerce(version);
	} catch (_) {
		return false;
	}
}

function semverComparisonForOperator(operator) {
	return {
		'>': semver.gt,
		'>=': semver.gte
	}[operator];
}

const create = context => {
	const options = {
		terms: ['todo', 'fixme', 'xxx'],
		ignoreDatesOnPullRequests: true,
		allowWarningComments: true,
		...context.options[0]
	};

	const sourceCode = context.getSourceCode();
	const comments = sourceCode.getAllComments();
	const unusedComments = comments
		.filter(token => token.type !== 'Shebang')
		// Block comments come as one.
		// Split for situations like this:
		// /*
		//  * TODO [2999-01-01]: Validate this
		//  * TODO [2999-01-01]: And this
		//  * TODO [2999-01-01]: Also this
		//  */
		.map(comment =>
			comment.value.split('\n').map(line => ({
				...comment,
				value: line
			}))
		)
		// Flatten
		.reduce((accumulator, array) => accumulator.concat(array), [])
		.filter(processComment);

	// This is highly dependable on ESLint's `no-warning-comments` implementation.
	// What we do is patch the parts we know the rule will use, `getAllComments`.
	// Since we have priority, we leave only the comments that we didn't use.
	const fakeContext = {
		...context,
		getSourceCode() {
			return {
				...sourceCode,
				getAllComments() {
					return options.allowWarningComments ? [] : unusedComments;
				}
			};
		}
	};
	const rules = baseRule.create(fakeContext);

	function processComment(comment) {
		const parsed = parseTodoWithArguments(comment.value, options);

		if (!parsed) {
			return true;
		}

		// Count if there are valid properties.
		// Otherwise, it's a useless TODO and falls back to `no-warning-comments`.
		let uses = 0;

		const {
			packageVersions = [],
			dates = [],
			dependencies = [],
			engines = [],
			unknowns = []
		} = parsed;

		if (dates.length > 1) {
			uses++;
			context.report({
				node: null,
				loc: comment.loc,
				messageId: MESSAGE_ID_AVOID_MULTIPLE_DATES,
				data: {
					expirationDates: dates.join(', '),
					message: parseTodoMessage(comment.value)
				}
			});
		} else if (dates.length === 1) {
			uses++;
			const [date] = dates;

			const shouldIgnore = options.ignoreDatesOnPullRequests && ci.isPR;
			if (!shouldIgnore && reachedDate(date)) {
				context.report({
					node: null,
					loc: comment.loc,
					messageId: MESSAGE_ID_EXPIRED_TODO,
					data: {
						expirationDate: date,
						message: parseTodoMessage(comment.value)
					}
				});
			}
		}

		if (packageVersions.length > 1) {
			uses++;
			context.report({
				node: null,
				loc: comment.loc,
				messageId: MESSAGE_ID_AVOID_MULTIPLE_PACKAGE_VERSIONS,
				data: {
					versions: packageVersions
						.map(({condition, version}) => `${condition}${version}`)
						.join(', '),
					message: parseTodoMessage(comment.value)
				}
			});
		} else if (packageVersions.length === 1) {
			uses++;
			const [{condition, version}] = packageVersions;

			const pkgVersion = tryToCoerceVersion(packageJson.version);
			const desidedPkgVersion = tryToCoerceVersion(version);

			const compare = semverComparisonForOperator(condition);
			if (compare(pkgVersion, desidedPkgVersion)) {
				context.report({
					node: null,
					loc: comment.loc,
					messageId: MESSAGE_ID_REACHED_PACKAGE_VERSION,
					data: {
						comparison: `${condition}${version}`,
						message: parseTodoMessage(comment.value)
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
				const [trigger, messageId] =
					dependency.condition === 'in' ?
						[hasTargetPackage, MESSAGE_ID_HAVE_PACKAGE] :
						[!hasTargetPackage, MESSAGE_ID_DONT_HAVE_PACKAGE];

				if (trigger) {
					context.report({
						node: null,
						loc: comment.loc,
						messageId,
						data: {
							package: dependency.name,
							message: parseTodoMessage(comment.value)
						}
					});
				}

				continue;
			}

			const todoVersion = tryToCoerceVersion(dependency.version);
			const targetPackageVersion = tryToCoerceVersion(targetPackageRawVersion);

			if (!hasTargetPackage || !targetPackageVersion) {
				// Can't compare `¯\_(ツ)_/¯`
				continue;
			}

			const compare = semverComparisonForOperator(dependency.condition);

			if (compare(targetPackageVersion, todoVersion)) {
				context.report({
					node: null,
					loc: comment.loc,
					messageId: MESSAGE_ID_VERSION_MATCHES,
					data: {
						comparison: `${dependency.name} ${dependency.condition} ${dependency.version}`,
						message: parseTodoMessage(comment.value)
					}
				});
			}
		}

		const pkgEngines = packageJson.engines || {};

		for (const engine of engines) {
			uses++;

			const targetPackageRawEngineVersion = pkgEngines.node;
			const hasTargetEngine = Boolean(targetPackageRawEngineVersion);

			if (!hasTargetEngine) {
				continue;
			}

			const todoEngine = tryToCoerceVersion(engine.version);
			const targetPackageEngineVersion = tryToCoerceVersion(
				targetPackageRawEngineVersion
			);

			const compare = semverComparisonForOperator(engine.condition);

			if (compare(targetPackageEngineVersion, todoEngine)) {
				context.report({
					node: null,
					loc: comment.loc,
					messageId: MESSAGE_ID_ENGINE_MATCHES,
					data: {
						comparison: `node${engine.condition}${engine.version}`,
						message: parseTodoMessage(comment.value)
					}
				});
			}
		}

		for (const unknown of unknowns) {
			// In this case, check if there's just an '@' missing before a '>' or '>='.
			const hasAt = unknown.includes('@');
			const comparisonIndex = unknown.indexOf('>');

			if (!hasAt && comparisonIndex !== -1) {
				const testString = `${unknown.slice(
					0,
					comparisonIndex
				)}@${unknown.slice(comparisonIndex)}`;

				if (parseArgument(testString).type !== 'unknowns') {
					uses++;
					context.report({
						node: null,
						loc: comment.loc,
						messageId: MESSAGE_ID_MISSING_AT_SYMBOL,
						data: {
							original: unknown,
							fix: testString,
							message: parseTodoMessage(comment.value)
						}
					});
					continue;
				}
			}

			const withoutWhitespaces = unknown.replace(/ /g, '');

			if (parseArgument(withoutWhitespaces).type !== 'unknowns') {
				uses++;
				context.report({
					node: null,
					loc: comment.loc,
					messageId: MESSAGE_ID_REMOVE_WHITESPACES,
					data: {
						original: unknown,
						fix: withoutWhitespaces,
						message: parseTodoMessage(comment.value)
					}
				});
				continue;
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

const schema = [
	{
		type: 'object',
		properties: {
			terms: {
				type: 'array',
				items: {
					type: 'string'
				}
			},
			ignoreDatesOnPullRequests: {
				type: 'boolean',
				default: true
			},
			allowWarningComments: {
				type: 'boolean',
				default: false
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		messages: {
			[MESSAGE_ID_AVOID_MULTIPLE_DATES]:
				'Avoid using multiple expiration dates in TODO: {{expirationDates}}. {{message}}',
			[MESSAGE_ID_EXPIRED_TODO]:
				'There is a TODO that is past due date: {{expirationDate}}. {{message}}',
			[MESSAGE_ID_REACHED_PACKAGE_VERSION]:
				'There is a TODO that is past due package version: {{comparison}}. {{message}}',
			[MESSAGE_ID_AVOID_MULTIPLE_PACKAGE_VERSIONS]:
				'Avoid using multiple package versions in TODO: {{versions}}. {{message}}',
			[MESSAGE_ID_HAVE_PACKAGE]:
				'There is a TODO that is deprecated since you installed: {{package}}. {{message}}',
			[MESSAGE_ID_DONT_HAVE_PACKAGE]:
				'There is a TODO that is deprecated since you uninstalled: {{package}}. {{message}}',
			[MESSAGE_ID_VERSION_MATCHES]:
				'There is a TODO match for package version: {{comparison}}. {{message}}',
			[MESSAGE_ID_ENGINE_MATCHES]:
				'There is a TODO match for Node.js version: {{comparison}}. {{message}}',
			[MESSAGE_ID_REMOVE_WHITESPACES]:
				'Avoid using whitespaces on TODO argument. On \'{{original}}\' use \'{{fix}}\'. {{message}}',
			[MESSAGE_ID_MISSING_AT_SYMBOL]:
				'Missing \'@\' on TODO argument. On \'{{original}}\' use \'{{fix}}\'. {{message}}'
		},
		schema
	}
};
