import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/expiring-todo-comments';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const expiredTodoError = expirationDate => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is past due date: ${expirationDate}`
});

const avoidMultipleDatesError = expirationDates => ({
	ruleId: 'expiring-todo-comments',
	message: `Avoid using multiple expiration dates in TODO: ${expirationDates}`
});

const havePackageError = pkg => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is deprecated since you installed: ${pkg}`
});

const dontHavePackageError = pkg => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is deprecated since you uninstalled: ${pkg}`
});

const versionMatchesError = comparison => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO match for package version: ${comparison}`
});

const engineMatchesError = comparison => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO match for engine version: ${comparison}`
});

const reachedPackageVersionError = version => ({
	ruleId: 'expiring-todo-comments',
	message: `There is a TODO that is past due package version: ${version}`
});

const avoidMultiplePackageVersionsError = versions => ({
	ruleId: 'expiring-todo-comments',
	message: `Avoid using multiple package versions in TODO: ${versions}`
});

const removeWhitespacesError = argument => ({
	ruleId: 'expiring-todo-comments',
	message: `Avoid using whitespaces on TODO argument. On '${argument}' use '${argument.replace(/ /g, '')}'`
});

const missingAtSymbolError = (bad, good) => ({
	ruleId: 'expiring-todo-comments',
	message: `Missing '@' on TODO argument. On '${bad}' use '${good}'`
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
			errors: [expiredTodoError('2000-01-01')],
			options: [{ignoreDatesOnPullRequests: false}]
		},
		{
			code: '// TODO [2200-12-12, 2200-12-12]: Multiple dates',
			errors: [avoidMultipleDatesError('2200-12-12, 2200-12-12')],
			output: '// TODO [2200-12-12, 2200-12-12]: Multiple dates'
		},
		{
			code: '// TODO [>1]: if your package.json version is >1',
			errors: [reachedPackageVersionError('>1')]
		},
		{
			code: '// TODO [>1, >2]: multiple package versions',
			errors: [avoidMultiplePackageVersionsError('>1, >2')]
		},
		{
			code: '// TODO [>=1]: if your package.json version is >=1',
			errors: [reachedPackageVersionError('>=1')]
		},
		{
			code: '// TODO [+read-pkg]: when you install `read-pkg`',
			errors: [havePackageError('read-pkg')]
		},
		{
			code: '// TODO [-popura]: when you uninstall `popura`',
			errors: [dontHavePackageError('popura')]
		},
		{
			code: '// TODO [read-pkg@>1]: when `read-pkg` version is > 1',
			errors: [versionMatchesError('read-pkg > 1')]
		},
		{
			code: '// TODO [engines:node>=8]: when support is for node > 8',
			errors: [engineMatchesError('node >= 8')]
		},
		{
			code: '// TODO [read-pkg@>=5.1.1]: when `read-pkg` version is >= 5.1.1',
			errors: [versionMatchesError('read-pkg >= 5.1.1')]
		},
		{
			code: '// TODO [semver>1]: Missing @.',
			errors: [missingAtSymbolError('semver>1', 'semver@>1')]
		},
		{
			code: '// TODO [> 1]: Remove whitespaces when it can fix',
			errors: [removeWhitespacesError('> 1')]
		},
		{
			code: '// TODO [semver@> 1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('semver@> 1')]
		},
		{
			code: '// TODO [semver @>1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('semver @>1')]
		},
		{
			code: '// TODO [semver@>= 1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('semver@>= 1')]
		},
		{
			code: '// TODO [semver @>=1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('semver @>=1')]
		},
		{
			code: '// TODO [engines:node >=1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('engines:node >=1')]
		},
		{
			code: '// TODO [engines:node>= 1]: Remove whitespaces when it can fix.',
			errors: [removeWhitespacesError('engines:node>= 1')]
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
		}
	]
});
