import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const expiredTodoError = (expirationDate, message) => ({
	message: `There is a TODO that is past due date: ${expirationDate}. ${message}`,
});

const avoidMultipleDatesError = (expirationDates, message) => ({
	message: `Avoid using multiple expiration dates in TODO: ${expirationDates}. ${message}`,
});

const havePackageError = (package_, message) => ({
	message: `There is a TODO that is deprecated since you installed: ${package_}. ${message}`,
});

const dontHavePackageError = (package_, message) => ({
	message: `There is a TODO that is deprecated since you uninstalled: ${package_}. ${message}`,
});

const versionMatchesError = (comparison, message) => ({
	message: `There is a TODO match for package version: ${comparison}. ${message}`,
});

const engineMatchesError = (comparison, message) => ({
	message: `There is a TODO match for Node.js version: ${comparison}. ${message}`,
});

const reachedPackageVersionError = (version, message) => ({
	message: `There is a TODO that is past due package version: ${version}. ${message}`,
});

const avoidMultiplePackageVersionsError = (versions, message) => ({
	message: `Avoid using multiple package versions in TODO: ${versions}. ${message}`,
});

const removeWhitespaceError = (argument, message) => ({
	message: `Avoid using whitespace on TODO argument. On '${argument}' use '${argument.replaceAll(' ', '')}'. ${message}`,
});

const missingAtSymbolError = (bad, good, message) => ({
	message: `Missing '@' on TODO argument. On '${bad}' use '${good}'. ${message}`,
});

const noWarningCommentError = comment => ({
	message: `Unexpected 'todo' comment without any conditions: '${comment}'.`,
});

test({
	valid: [
		'// TODO [2200-12-12]: Too long... Can you feel it?',
		'// FIXME [2200-12-12]: Too long... Can you feel it?',
		'// XXX [2200-12-12]: Too long... Can you feel it?',
		'// TODO (lubien) [2200-12-12]: Too long... Can you feel it?',
		'// FIXME [2200-12-12] (lubien): Too long... Can you feel it?',
		{
			code: '// Expire Condition [2200-12-12]: new term name',
			options: [{terms: ['Expire Condition']}],
		},
		'// Expire Condition [2000-01-01]: new term name',
		'// TODO [>2000]: We sure didnt past this version',
		// Partial versions should use semver range semantics (#1132)
		// `>1` means `>=2.0.0`, not `>1.0.0`; `>63` means `>=64.0.0`, not `>63.0.0`
		'// TODO [>63]: package is 63.0.0 so >63 should not trigger',
		'// TODO [find-up-simple@>1]: find-up-simple is 1.0.1 so >1 should not trigger',
		'// TODO [engine:node@>20]: node engine is 20.x so >20 should not trigger',
		'// TODO [-find-up-simple]: We actually use this.',
		'// TODO [+popura]: I think we wont need a broken package.',
		'// TODO [semver@>1000]: Welp hopefully we wont get at that.',
		'// TODO [semver@>=1000]: Welp hopefully we wont get at that.',
		'// TODO [@lubien/fixture-beta-package@>=1.0.0]: we are using a pre-release',
		'// TODO [@lubien/fixture-beta-package@>=1.0.0-gamma.1]: beta comes first from gamma',
		'// TODO [@lubien/fixture-beta-package@>=1.0.0-beta.2]: we are in beta.1',
		'// TODO [2200-12-12, -find-up-simple]: Combo',
		'// TODO [2200-12-12, -find-up-simple, +popura]: Combo',
		'// TODO [2200-12-12, -find-up-simple, +popura, semver@>=1000]: Combo',
		'// TODO [engine:node@>=100]: When we start supporting only >= 10',
		`// TODO [2200-12-12]: Multiple
		// TODO [2200-12-12]: Lines`,
		`/*
		  * TODO [2200-12-12]: Yet
		  * TODO [engine:node@>=100]: Another
		  * TODO [+popura]: Way
		  */`,
		{
			code: '// TODO',
		},
		{
			code: '// TODO [invalid]',
		},
		{
			code: '// TODO [] might have [some] that [try [to trick] me]',
		},
		{
			code: '// TODO [but [it will]] [fallback] [[[ to the default ]]] rule [[',
		},
		{
			code: '// TODO ISSUE-123 fix later',
			options: [{allowWarningComments: false, ignore: [String.raw`ISSUE-\d+`]}],
		},
		{
			code: '// TODO [ISSUE-123] fix later',
			options: [{allowWarningComments: false, ignore: [String.raw`ISSUE-\d+`]}],
		},
		{
			code: '// TODO [1999-01-01, ISSUE-123] fix later',
			options: [{allowWarningComments: false, ignore: [String.raw`ISSUE-\d+`]}],
		},
		{
			code: '// TODO [Issue-123] fix later',
			options: [{allowWarningComments: false, ignore: [/issue-\d+/i]}],
		},
		{
			code: '// TODO [2001-01-01]: quite old',
			options: [{date: '2000-01-01'}],
		},
		{
			code: '// TODO [2000-01-01]: too old but ignored in all environments',
			options: [{ignoreDates: true, ignoreDatesOnPullRequests: false}],
		},
		{
			code: `// eslint-disable-next-line rule-to-test/expiring-todo-comments
				   // TODO without a date`,
			options: [{allowWarningComments: false}],
		},
		{
			code: `/* eslint-disable rule-to-test/expiring-todo-comments */
				   // TODO without a date
				   // fixme [2000-01-01]: too old'
				   /* eslint-enable rule-to-test/expiring-todo-comments */`,
			options: [{allowWarningComments: false}],
		},
	],
	invalid: [
		{
			code: '// TODO [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: `/*
			* TODO [2000-01-01]: Yet
			* TODO [2000-01-01]: Another
			* TODO [2000-01-01] Way
			*/`,
			errors: [
				expiredTodoError('2000-01-01', 'Yet'),
				expiredTodoError('2000-01-01', 'Another'),
				expiredTodoError('2000-01-01', 'Way'),
			],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: `/*
			* TODO [2000-01-01]: Invalid
			* TODO [2200-01-01]: Valid
			* TODO [2000-01-01]: Invalid
			*/`,
			errors: [
				expiredTodoError('2000-01-01', 'Invalid'),
				expiredTodoError('2000-01-01', 'Invalid'),
			],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: `/*
			* Something here
			* TODO [engine:node@>=8]: Invalid
			* Also something here
			*/`,
			errors: [
				engineMatchesError('node>=8', 'Invalid'),
			],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: '// fixme [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: '// xxx [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: '// ToDo [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: '// fIxME [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: '// Todoist [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false, terms: ['Todoist']}],
		},
		{
			code: '// Expire Condition [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false, terms: ['Expire Condition']}],
		},
		{
			code: '// XxX [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: '// TODO [2200-12-12, 2200-12-12]: Multiple dates',
			errors: [avoidMultipleDatesError('2200-12-12, 2200-12-12', 'Multiple dates')],
		},
		{
			code: '// TODO [2200-12-12, 2200-12-12]: Multiple dates are still invalid',
			errors: [avoidMultipleDatesError('2200-12-12, 2200-12-12', 'Multiple dates are still invalid')],
			options: [{ignoreDates: true}],
		},
		{
			code: '// TODO [>1]: if your package.json version is >1',
			errors: [reachedPackageVersionError('>1', 'if your package.json version is >1')],
		},
		{
			code: '// TODO [>1, >2]: multiple package versions',
			errors: [avoidMultiplePackageVersionsError('>1, >2', 'multiple package versions')],
		},
		{
			code: '// TODO [>=1]: if your package.json version is >=1',
			errors: [reachedPackageVersionError('>=1', 'if your package.json version is >=1')],
		},
		{
			code: '// TODO [+find-up-simple]: when you install `find-up-simple`',
			errors: [havePackageError('find-up-simple', 'when you install `find-up-simple`')],
		},
		{
			code: '// TODO [-popura]: when you uninstall `popura`',
			errors: [dontHavePackageError('popura', 'when you uninstall `popura`')],
		},
		{
			code: '// TODO [find-up-simple@>=1]: when `find-up-simple` version is >= 1',
			errors: [versionMatchesError('find-up-simple >= 1', 'when `find-up-simple` version is >= 1')],
		},
		{
			code: '// TODO [engine:node@>=8]: when support is for node >= 8',
			errors: [engineMatchesError('node>=8', 'when support is for node >= 8')],
		},
		{
			code: '// TODO [find-up-simple@>0.2.0]: when `find-up-simple` version is > 0.2.0',
			errors: [versionMatchesError('find-up-simple > 0.2.0', 'when `find-up-simple` version is > 0.2.0')],
		},
		{
			code: '// TODO [@lubien/fixture-beta-package@>=1.0.0-alfa.1]: when `@lubien/fixture-beta-package` version is >= 1.0.0-alfa.1',
			errors: [versionMatchesError('@lubien/fixture-beta-package >= 1.0.0-alfa.1', 'when `@lubien/fixture-beta-package` version is >= 1.0.0-alfa.1')],
		},
		{
			code: '// TODO [@lubien/fixture-beta-package@>=1.0.0-beta.1]: when `@lubien/fixture-beta-package` version is >= 1.0.0-beta.1',
			errors: [versionMatchesError('@lubien/fixture-beta-package >= 1.0.0-beta.1', 'when `@lubien/fixture-beta-package` version is >= 1.0.0-beta.1')],
		},
		{
			code: '// TODO [@lubien/fixture-beta-package@>=1.0.0-beta.0]: when `@lubien/fixture-beta-package` version is >= 1.0.0-beta.0',
			errors: [versionMatchesError('@lubien/fixture-beta-package >= 1.0.0-beta.0', 'when `@lubien/fixture-beta-package` version is >= 1.0.0-beta.0')],
		},
		{
			code: '// TODO [@lubien/fixture-beta-package@>0.9]: when `@lubien/fixture-beta-package` prerelease version is > 0.9',
			errors: [versionMatchesError('@lubien/fixture-beta-package > 0.9', 'when `@lubien/fixture-beta-package` prerelease version is > 0.9')],
		},
		{
			code: '// TODO [semver>1]: Missing @.',
			errors: [missingAtSymbolError('semver>1', 'semver@>1', 'Missing @.')],
		},
		{
			code: '// TODO [> 1]: Remove whitespace when it can fix.',
			errors: [removeWhitespaceError('> 1', 'Remove whitespace when it can fix.')],
		},
		{
			code: '// TODO [semver@> 1]: Remove whitespace when it can fix.',
			errors: [removeWhitespaceError('semver@> 1', 'Remove whitespace when it can fix.')],
		},
		{
			code: '// TODO [semver @>1]: Remove whitespace when it can fix.',
			errors: [removeWhitespaceError('semver @>1', 'Remove whitespace when it can fix.')],
		},
		{
			code: '// TODO [semver@>= 1]: Remove whitespace when it can fix.',
			errors: [removeWhitespaceError('semver@>= 1', 'Remove whitespace when it can fix.')],
		},
		{
			code: '// TODO [semver @>=1]: Remove whitespace when it can fix.',
			errors: [removeWhitespaceError('semver @>=1', 'Remove whitespace when it can fix.')],
		},
		{
			code: '// TODO [engine:node @>=1]: Remove whitespace when it can fix.',
			errors: [removeWhitespaceError('engine:node @>=1', 'Remove whitespace when it can fix.')],
		},
		{
			code: '// TODO [engine:node@>= 1]: Remove whitespace when it can fix.',
			errors: [removeWhitespaceError('engine:node@>= 1', 'Remove whitespace when it can fix.')],
		},
		{
			code: '// TODO',
			errors: [noWarningCommentError('TODO')],
			options: [{allowWarningComments: false}],
		},
		{
			code: '// TODO []',
			errors: [noWarningCommentError('TODO []')],
			options: [{allowWarningComments: false}],
		},
		{
			code: '// TODO [no meaning at all]',
			errors: [noWarningCommentError('TODO [no meaning at all]')],
			options: [{allowWarningComments: false}],
		},
		{
			code: '// TODO [] might have [some] that [try [to trick] me]',
			errors: [noWarningCommentError('TODO [] might have [some] that [try [to...')],
			options: [{allowWarningComments: false}],
		},
		{
			code: '// TODO [but [it will]] [fallback] [[[ to the default ]]] rule [[[',
			errors: [noWarningCommentError('TODO [but [it will]] [fallback] [[[ to...')],
			options: [{allowWarningComments: false}],
		},
		{
			code: '// TODO [engine:npm@>=10000]: Unsupported engine',
			errors: [noWarningCommentError('TODO [engine:npm@>=10000]: Unsupported...')],
			options: [{allowWarningComments: false}],
		},
		{
			code: '// TODO [engine:somethingrandom@>=10000]: Unsupported engine',
			errors: [noWarningCommentError('TODO [engine:somethingrandom@>=10000]:...')],
			options: [{allowWarningComments: false}],
		},
		{
			code: '// TODO [2000-01-01, >1]: Combine date with package version',
			errors: [
				expiredTodoError('2000-01-01', 'Combine date with package version'),
				reachedPackageVersionError('>1', 'Combine date with package version'),
			],
			options: [{ignoreDatesOnPullRequests: false}],
		},
		{
			code: '// TODO [2200-12-12, >1, 2200-12-12, >2]: Multiple dates and package versions',
			errors: [
				avoidMultipleDatesError('2200-12-12, 2200-12-12', 'Multiple dates and package versions'),
				avoidMultiplePackageVersionsError('>1, >2', 'Multiple dates and package versions'),
			],
		},
		{
			code: '// TODO [-popura, find-up-simple@>=1]: Combine not having a package with version match',
			errors: [
				dontHavePackageError('popura', 'Combine not having a package with version match'),
				versionMatchesError('find-up-simple >= 1', 'Combine not having a package with version match'),
			],
		},
		{
			code: '// TODO [+find-up-simple, -popura]: Combine presence/absence of packages',
			errors: [
				havePackageError('find-up-simple', 'Combine presence/absence of packages'),
				dontHavePackageError('popura', 'Combine presence/absence of packages'),
			],
		},
		{
			code: '// Expire Condition [2000-01-01, semver>1]: Expired TODO and missing symbol',
			errors: [
				expiredTodoError('2000-01-01', 'Expired TODO and missing symbol'),
				missingAtSymbolError('semver>1', 'semver@>1', 'Expired TODO and missing symbol'),
			],
			options: [{ignoreDatesOnPullRequests: false, terms: ['Expire Condition']}],
		},
		{
			code: '// TODO [semver @>=1, -popura]: Package uninstalled and whitespace error',
			errors: [
				dontHavePackageError('popura', 'Package uninstalled and whitespace error'),
				removeWhitespaceError('semver @>=1', 'Package uninstalled and whitespace error'),
			],
		},
		{
			code: '// HUGETODO [semver @>=1, engine:node@>=8, 2000-01-01, -popura, >1, +find-up-simple, find-up-simple@>=1]: Big mix',
			errors: [
				expiredTodoError('2000-01-01', 'Big mix'),
				reachedPackageVersionError('>1', 'Big mix'),
				dontHavePackageError('popura', 'Big mix'),
				havePackageError('find-up-simple', 'Big mix'),
				versionMatchesError('find-up-simple >= 1', 'Big mix'),
				engineMatchesError('node>=8', 'Big mix'),
				removeWhitespaceError('semver @>=1', 'Big mix'),
			],
			options: [{ignoreDatesOnPullRequests: false, terms: ['HUGETODO']}],
		},
		{
			code: '// TODO [ISSUE-123] fix later',
			options: [{allowWarningComments: false, ignore: []}],
			errors: [
				noWarningCommentError('TODO [ISSUE-123] fix later'),
			],
		},
		{
			code: `
			// TODO fix later
			// TODO ISSUE-123 fix later
			`,
			options: [{allowWarningComments: false, ignore: [/issue-\d+/i]}],
			errors: [
				noWarningCommentError('TODO fix later'),
			],
		},
		{
			code: `/*
			TODO Invalid
			TODO ISSUE-123 Valid
			*/`,
			options: [{allowWarningComments: false, ignore: [/issue-\d+/i]}],
			errors: [
				noWarningCommentError('TODO Invalid'),
			],
		},
		{
			code: '// TODO [2999-12-01]: Y3K bug',
			options: [{date: '3000-01-01', ignoreDatesOnPullRequests: false}],
			errors: [expiredTodoError('2999-12-01', 'Y3K bug')],
		},
	],
});
