import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/expiring-todo-comments';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const expiredTodoError = (expirationDate, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is past due date: ${expirationDate}. ${message}`
});

const avoidMultipleDatesError = (expirationDates, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `Avoid using multiple expiration dates in TODO: ${expirationDates}. ${message}`
});

const havePackageError = (package_, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is deprecated since you installed: ${package_}. ${message}`
});

const dontHavePackageError = (package_, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is deprecated since you uninstalled: ${package_}. ${message}`
});

const versionMatchesError = (comparison, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO match for package version: ${comparison}. ${message}`
});

const engineMatchesError = (comparison, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO match for Node.js version: ${comparison}. ${message}`
});

const reachedPackageVersionError = (version, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is past due package version: ${version}. ${message}`
});

const avoidMultiplePackageVersionsError = (versions, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `Avoid using multiple package versions in TODO: ${versions}. ${message}`
});

const removeWhitespacesError = (argument, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `Avoid using whitespaces on TODO argument. On '${argument}' use '${argument.replace(/ /g, '')}'. ${message}`
});

const missingAtSymbolError = (bad, good, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `Missing '@' on TODO argument. On '${bad}' use '${good}'. ${message}`
});

const noWarningCommentError = () => ({
	ruleId: 'expiring-todo-comments',
	message: 'Unexpected \'todo\' comment.'
});

ruleTester.run('expiring-todo-comments', rule, {
	valid: [
		'// TODO [2200-12-12]: Too long... Can you feel it?',
		'// FIXME [2200-12-12]: Too long... Can you feel it?',
		'// XXX [2200-12-12]: Too long... Can you feel it?',
		'// TODO (lubien) [2200-12-12]: Too long... Can you feel it?',
		'// FIXME [2200-12-12] (lubien): Too long... Can you feel it?',
		{
			code: '// Expire Condition [2200-12-12]: new term name',
			errors: [],
			options: [{terms: ['Expire Condition']}]
		},
		'// Expire Condition [2000-01-01]: new term name',
		'// TODO [>2000]: We sure didnt past this version',
		'// TODO [-read-pkg-up]: We actually use this.',
		'// TODO [+popura]: I think we wont need a broken package.',
		'// TODO [semver@>1000]: Welp hopefully we wont get at that.',
		'// TODO [semver@>=1000]: Welp hopefully we wont get at that.',
		'// TODO [2200-12-12, -read-pkg-up]: Combo',
		'// TODO [2200-12-12, -read-pkg-up, +popura]: Combo',
		'// TODO [2200-12-12, -read-pkg-up, +popura, semver@>=1000]: Combo',
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
			errors: []
		},
		{
			code: '// TODO [invalid]',
			errors: []
		},
		{
			code: '// TODO [] might have [some] that [try [to trick] me]',
			errors: []
		},
		{
			code: '// TODO [but [it will]] [fallback] [[[ to the default ]]] rule [[',
			errors: []
		}
	],
	invalid: [
		{
			code: '// TODO [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: `/*
			* TODO [2000-01-01]: Yet
			* TODO [2000-01-01]: Another
			* TODO [2000-01-01]: Way
			*/`,
			errors: [
				expiredTodoError('2000-01-01', 'Yet'),
				expiredTodoError('2000-01-01', 'Another'),
				expiredTodoError('2000-01-01', 'Way')
			],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: `/*
			* TODO [2000-01-01]: Invalid
			* TODO [2200-01-01]: Valid
			* TODO [2000-01-01]: Invalid
			*/`,
			errors: [
				expiredTodoError('2000-01-01', 'Invalid'),
				expiredTodoError('2000-01-01', 'Invalid')
			],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: `/*
			* Something here
			* TODO [engine:node@>=8]: Invalid
			* Also something here
			*/`,
			errors: [
				engineMatchesError('node>=8', 'Invalid')
			],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: '// fixme [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: '// xxx [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: '// ToDo [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: '// fIxME [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: '// Todoist [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false, terms: ['Todoist']}]
		},
		{
			code: '// Expire Condition [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false, terms: ['Expire Condition']}]
		},
		{
			code: '// XxX [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: '// TODO [2200-12-12, 2200-12-12]: Multiple dates',
			errors: [avoidMultipleDatesError('2200-12-12, 2200-12-12', 'Multiple dates')],
			output: '// TODO [2200-12-12, 2200-12-12]: Multiple dates'
		},
		{
			code: '// TODO [>1]: if your package.json version is >1',
			errors: [reachedPackageVersionError('>1', 'if your package.json version is >1')]
		},
		{
			code: '// TODO [>1, >2]: multiple package versions',
			errors: [avoidMultiplePackageVersionsError('>1, >2', 'multiple package versions')]
		},
		{
			code: '// TODO [>=1]: if your package.json version is >=1',
			errors: [reachedPackageVersionError('>=1', 'if your package.json version is >=1')]
		},
		{
			code: '// TODO [+read-pkg-up]: when you install `read-pkg-up`',
			errors: [havePackageError('read-pkg-up', 'when you install `read-pkg-up`')]
		},
		{
			code: '// TODO [-popura]: when you uninstall `popura`',
			errors: [dontHavePackageError('popura', 'when you uninstall `popura`')]
		},
		{
			code: '// TODO [read-pkg-up@>1]: when `read-pkg-up` version is > 1',
			errors: [versionMatchesError('read-pkg-up > 1', 'when `read-pkg-up` version is > 1')]
		},
		{
			code: '// TODO [engine:node@>=8]: when support is for node >= 8',
			errors: [engineMatchesError('node>=8', 'when support is for node >= 8')]
		},
		{
			code: '// TODO [read-pkg-up@>=5.1.1]: when `read-pkg-up` version is >= 5.1.1',
			errors: [versionMatchesError('read-pkg-up >= 5.1.1', 'when `read-pkg-up` version is >= 5.1.1')]
		},
		{
			code: '// TODO [semver>1]: Missing @.',
			errors: [missingAtSymbolError('semver>1', 'semver@>1', 'Missing @.')]
		},
		{
			code: '// TODO [> 1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('> 1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO [semver@> 1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('semver@> 1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO [semver @>1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('semver @>1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO [semver@>= 1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('semver@>= 1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO [semver @>=1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('semver @>=1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO [engine:node @>=1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('engine:node @>=1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO [engine:node@>= 1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('engine:node@>= 1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO',
			errors: [noWarningCommentError()],
			options: [{allowWarningComments: false}]
		},
		{
			code: '// TODO []',
			errors: [noWarningCommentError()],
			options: [{allowWarningComments: false}]
		},
		{
			code: '// TODO [no meaning at all]',
			errors: [noWarningCommentError()],
			options: [{allowWarningComments: false}]
		},
		{
			code: '// TODO [] might have [some] that [try [to trick] me]',
			errors: [noWarningCommentError()],
			options: [{allowWarningComments: false}]
		},
		{
			code: '// TODO [but [it will]] [fallback] [[[ to the default ]]] rule [[[',
			errors: [noWarningCommentError()],
			options: [{allowWarningComments: false}]
		},
		{
			code: '// TODO [engine:npm@>=10000]: Unsupported engine',
			errors: [noWarningCommentError()],
			options: [{allowWarningComments: false}]
		},
		{
			code: '// TODO [engine:somethingrandom@>=10000]: Unsupported engine',
			errors: [noWarningCommentError()],
			options: [{allowWarningComments: false}]
		},
		{
			code: '// TODO [2000-01-01, >1]: Combine date with package version',
			errors: [
				expiredTodoError('2000-01-01', 'Combine date with package version'),
				reachedPackageVersionError('>1', 'Combine date with package version')
			],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: '// TODO [2200-12-12, >1, 2200-12-12, >2]: Multiple dates and package versions',
			errors: [
				avoidMultipleDatesError('2200-12-12, 2200-12-12', 'Multiple dates and package versions'),
				avoidMultiplePackageVersionsError('>1, >2', 'Multiple dates and package versions')
			]
		},
		{
			code: '// TODO [-popura, read-pkg-up@>1]: Combine not having a package with version match',
			errors: [
				dontHavePackageError('popura', 'Combine not having a package with version match'),
				versionMatchesError('read-pkg-up > 1', 'Combine not having a package with version match')
			]
		},
		{
			code: '// TODO [+read-pkg-up, -popura]: Combine presence/absence of packages',
			errors: [
				havePackageError('read-pkg-up', 'Combine presence/absence of packages'),
				dontHavePackageError('popura', 'Combine presence/absence of packages')
			]
		},
		{
			code: '// Expire Condition [2000-01-01, semver>1]: Expired TODO and missing symbol',
			errors: [
				expiredTodoError('2000-01-01', 'Expired TODO and missing symbol'),
				missingAtSymbolError('semver>1', 'semver@>1', 'Expired TODO and missing symbol')
			],
			options: [{ignoreDatesOnPullRequests: false, terms: ['Expire Condition']}]
		},
		{
			code: '// TODO [semver @>=1, -popura]: Package uninstalled and whitespaces error',
			errors: [
				dontHavePackageError('popura', 'Package uninstalled and whitespaces error'),
				removeWhitespacesError('semver @>=1', 'Package uninstalled and whitespaces error')
			]
		},
		{
			code: '// HUGETODO [semver @>=1, engine:node@>=8, 2000-01-01, -popura, >1, +read-pkg-up, read-pkg-up@>1]: Big mix',
			errors: [
				expiredTodoError('2000-01-01', 'Big mix'),
				reachedPackageVersionError('>1', 'Big mix'),
				dontHavePackageError('popura', 'Big mix'),
				havePackageError('read-pkg-up', 'Big mix'),
				versionMatchesError('read-pkg-up > 1', 'Big mix'),
				engineMatchesError('node>=8', 'Big mix'),
				removeWhitespacesError('semver @>=1', 'Big mix')
			],
			options: [{ignoreDatesOnPullRequests: false, terms: ['HUGETODO']}]
		}
	]
});
