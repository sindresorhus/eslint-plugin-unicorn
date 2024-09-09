import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'var hasCompleted = true',
		'var _isCompleted = true',
		'var __isCompleted = true',
		'var hasCompleted = Boolean(0)',
		'var hasCompleted = !0',
		'var hasCompleted = !!0',
		{
			code: 'var willUpdate = true; var allowsUpdate = true',
			options: [{prefixes: ['will', 'allows']}],
		},
	],
	invalid: [
		'const completed = true',
		'const completed = progress === 100',
		'const completed = Boolean(\'true\')',
		'const completed = new Boolean(\'true\')',
		'const adult = age >= 18',
		'const adult = age >= 18 ? true : false',
		'const gotModifyRights = isGotPreviewRights() && isGotDownloadRights()',
		'const showingModal = !!modalElement',
		'const showingModal = (this.showingModal = true)',
		'const showingModal = (doSomething(), !!modalElement)',
		outdent`
			async function foo() {
				const completed = await progress === 100;
			}
		`,
		outdent`
			function* foo() {
				const completed = yield progress === 100;
			}
		`,
		outdent`
			const hasCompleted = true
			const downloaded = hasCompleted
		`,
		outdent`
			const hasCompleted = () => progress === 100

			const downloaded = hasCompleted()
		`,
	],
});

// Make sure variables are renamed correctly
test.snapshot({
	valid: [
	],
	invalid: [
		outdent`
			const completed = true

			function foo(completed) {
				console.log(completed)
			}

			console.log(completed)
		`,
		outdent`
			const completed = true

			export { completed }
		`,
		outdent`
			const completed = true

			const task =  { completed }
		`,
		// Should rename to a non-conflicting name
		outdent`
			const completed = true

			const hasCompleted = () => completed
		`,
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'var completed: boolean',
		'const completed = hasCompleted as  boolean',
		'const completed = hasCompleted() as  boolean',
		outdent`
			var hasCompleted: boolean
			const downloaded = hasCompleted
		`,
		outdent`
			function hasCompleted(): boolean {}
			const downloaded = hasCompleted()
		`,
		'function download(url: string, showProgress: boolean) {}',
	].map(code => ({
		code,
		languageOptions: {parser: parsers.typescript},
	})),
});
