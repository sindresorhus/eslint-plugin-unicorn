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
	message: `You have a TODO that past due date ${expirationDate}`
});

const avoidMultipleDatesError = expirationDates => ({
	ruleId: 'expiring-todo-comments',
	message: `Avoid using multiple expiration dates for TODO ${expirationDates}`
});

const havePackageError = pkg => ({
	ruleId: 'expiring-todo-comments',
	message: `You have a TODO that is deprecated since you installed ${pkg}`
});

const dontHavePackageError = pkg => ({
	ruleId: 'expiring-todo-comments',
	message: `You have a TODO that is deprecated since you uninstalled ${pkg}`
});

const versionMatchesError = comparison => ({
	ruleId: 'expiring-todo-comments',
	message: `You have a TODO matches version for package ${comparison}`
});

const reachedPackageVersionError = version => ({
	ruleId: 'expiring-todo-comments',
	message: `You have a TODO that past due package version ${version}`
});

const avoidMultiplePackageVersionsError = versions => ({
	ruleId: 'expiring-todo-comments',
	message: `Avoid asking multiple package versions for TODO ${versions}`
});

ruleTester.run('expiring-todo-comments', rule, {
	valid: [
		'// TODO [2200-12-12]: Too long... Can you feel it?',
		'// FIXME [2200-12-12]: Too long... Can you feel it?',
		'// TODO (lubien) [2200-12-12]: Too long... Can you feel it?',
		'// FIXME [2200-12-12] (lubien): Too long... Can you feel it?',
		'// TODO [>2000]: We sure didnt past this version',
		'// TODO [> 1]: Ignore if space',
		'// TODO [-read-pkg]: We actually use this.',
		'// TODO [+popura]: I think we wont need a broken package.',
		'// TODO [semver@>1000]: Welp hopefully we wont get at that.',
		'// TODO [semver@>=1000]: Welp hopefully we wont get at that.',
		'// TODO [semver>1]: Ignore if miss @.',
		'// TODO [semver>=1]: Ignore if miss @.',
		'// TODO [semver> 1]: Ignore if space.',
		'// TODO [semver >1]: Ignore if space.',
		'// TODO [semver > 1]: Ignore if space.',
		'// TODO [semver >= 1]: Ignore if space.',
		'// TODO [2200-12-12, -read-pkg]: Combo',
		'// TODO [2200-12-12, -read-pkg, +popura]: Combo',
		'// TODO [2200-12-12, -read-pkg, +popura, semver>=1000]: Combo',
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
			output: '// TODO [2000-01-01]: too old'
		},
		{
			code: '// TODO [2200-12-12, 2200-12-12]: Multiple dates',
			errors: [avoidMultipleDatesError('2200-12-12, 2200-12-12')],
			output: '// TODO [2200-12-12, 2200-12-12]: Multiple dates'
		},
		{
			code: '// TODO [>1]: if your package.json version is > 1',
			errors: [reachedPackageVersionError('> 1')],
			output: '// TODO [>1]: if your package.json version is > 1'
		},
		{
			code: '// TODO [>1, >2]: multiple package versions',
			errors: [avoidMultiplePackageVersionsError('> 1, > 2')],
			output: '// TODO [>1, >2]: multiple package versions'
		},
		{
			code: '// TODO [>=1]: if your package.json version is >= 1',
			errors: [reachedPackageVersionError('>= 1')],
			output: '// TODO [>=1]: if your package.json version is >= 1'
		},
		{
			code: '// TODO [+read-pkg]: when you install `read-pkg`',
			errors: [havePackageError('read-pkg')],
			output: '// TODO [+read-pkg]: when you install `read-pkg`'
		},
		{
			code: '// TODO [-popura]: when you uninstall `popura`',
			errors: [dontHavePackageError('popura')],
			output: '// TODO [-popura]: when you uninstall `popura`'
		},
		{
			code: '// TODO [read-pkg@>1]: when `read-pkg` version is > 1',
			errors: [versionMatchesError('read-pkg > 1')],
			output: '// TODO [read-pkg@>1]: when `read-pkg` version is > 1'
		},
		{
			code: '// TODO [read-pkg@>=5.1.1]: when `read-pkg` version is >= 5.1.1',
			errors: [versionMatchesError('read-pkg >= 5.1.1')],
			output: '// TODO [read-pkg@>=5.1.1]: when `read-pkg` version is >= 5.1.1'
		}
	]
});
