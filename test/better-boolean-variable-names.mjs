import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'var isCompleted = true',
		'var _isCompleted = true',
		'var __isCompleted = true',
		'var isCompleted = Boolean(0)',
		'var isCompleted = !0',
		'var isCompleted = !!0',
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
			const isCompleted = true
			const downloaded = isCompleted
		`,
		outdent`
			const isCompleted = () => progress === 100

			const downloaded = isCompleted()
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
	],
});

test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'var completed: boolean',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const completed = isCompleted as  boolean',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const completed = isCompleted() as  boolean',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				var isCompleted: boolean
				const downloaded = isCompleted
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function isCompleted(): boolean {}
				const downloaded = isCompleted()
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function download(url: string, showProgress: boolean) {}',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
