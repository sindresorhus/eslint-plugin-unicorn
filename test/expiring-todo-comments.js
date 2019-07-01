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

const havePackageError = (pkg, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is deprecated since you installed: ${pkg}. ${message}`
});

const dontHavePackageError = (pkg, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is deprecated since you uninstalled: ${pkg}. ${message}`
});

const versionMatchesError = (comparison, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO match for package version: ${comparison}. ${message}`
});

const engineMatchesError = (comparison, message) => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO match for engine version: ${comparison}. ${message}`
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
		'// TODO [-read-pkg]: We actually use this.',
		'// TODO [+popura]: I think we wont need a broken package.',
		'// TODO [semver@>1000]: Welp hopefully we wont get at that.',
		'// TODO [semver@>=1000]: Welp hopefully we wont get at that.',
		'// TODO [2200-12-12, -read-pkg]: Combo',
		'// TODO [2200-12-12, -read-pkg, +popura]: Combo',
		'// TODO [2200-12-12, -read-pkg, +popura, semver@>=1000]: Combo',
		'// TODO [engines:node>=100]: When we start supporting only >= 10',
		`// TODO [2200-12-12]: Multiple
		// TODO [2200-12-12]: Lines`,
		`/*
		  * TODO [2200-12-12]: Yet
		  * TODO [2200-12-12]: Another
		  * TODO [2200-12-12]: Way
		  */`
	],
	invalid: [
		{
			code: '// TODO [2000-01-01]: too old',
			errors: [expiredTodoError('2000-01-01', 'too old')],
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
			code: '// TODO [+read-pkg]: when you install `read-pkg`',
			errors: [havePackageError('read-pkg', 'when you install `read-pkg`')]
		},
		{
			code: '// TODO [-popura]: when you uninstall `popura`',
			errors: [dontHavePackageError('popura', 'when you uninstall `popura`')]
		},
		{
			code: '// TODO [read-pkg@>1]: when `read-pkg` version is > 1',
			errors: [versionMatchesError('read-pkg > 1', 'when `read-pkg` version is > 1')]
		},
		{
			code: '// TODO [engines:node>=8]: when support is for node > 8',
			errors: [engineMatchesError('node>=8', 'when support is for node > 8')]
		},
		{
			code: '// TODO [read-pkg@>=5.1.1]: when `read-pkg` version is >= 5.1.1',
			errors: [versionMatchesError('read-pkg >= 5.1.1', 'when `read-pkg` version is >= 5.1.1')]
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
			code: '// TODO [engines:node >=1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('engines:node >=1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO [engines:node>= 1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('engines:node>= 1', 'Remove whitespaces when it can fix.')]
		},
		{
			code: '// TODO',
			errors: [noWarningCommentError()]
		},
		{
			code: '// TODO []',
			errors: [noWarningCommentError()]
		},
		{
			code: '// TODO [no meaning at all]',
			errors: [noWarningCommentError()]
		},
		{
			code: '// TODO [] might have [some] that [try [to trick] me]',
			errors: [noWarningCommentError()]
		},
		{
			code: '// TODO [but [it will]] [fallback] [[[ to the default ]]] rule [[[',
			errors: [noWarningCommentError()]
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
			code: '// TODO [-popura, read-pkg@>1]: Combine not having a package with version match',
			errors: [
				dontHavePackageError('popura', 'Combine not having a package with version match'),
				versionMatchesError('read-pkg > 1', 'Combine not having a package with version match')
			]
		},
		{
			code: '// TODO [+read-pkg, -popura]: Combine presence/absence of packages',
			errors: [
				havePackageError('read-pkg', 'Combine presence/absence of packages'),
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
			code: '// HUGETODO [semver @>=1, engines:node>=8, 2000-01-01, -popura, >1, +read-pkg, read-pkg@>1]: Big mix',
			errors: [
				expiredTodoError('2000-01-01', 'Big mix'),
				reachedPackageVersionError('>1', 'Big mix'),
				dontHavePackageError('popura', 'Big mix'),
				havePackageError('read-pkg', 'Big mix'),
				versionMatchesError('read-pkg > 1', 'Big mix'),
				engineMatchesError('node>=8', 'Big mix'),
				removeWhitespacesError('semver @>=1', 'Big mix')

			],
			options: [{ignoreDatesOnPullRequests: false, terms: ['HUGETODO']}]
		}
	]
});
