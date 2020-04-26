'use strict';

const typescriptArguments = ['--parser', '@typescript-eslint/parser', '--ext', '.ts,.js'];
const vueArguments = ['--parser', 'vue-eslint-parser', '--ext', '.vue,.js'];

module.exports = [
	'https://github.com/avajs/ava',
	'https://github.com/chalk/chalk',
	'https://github.com/chalk/wrap-ansi',
	'https://github.com/sindresorhus/np',
	'https://github.com/sindresorhus/ora',
	'https://github.com/sindresorhus/p-map',
	'https://github.com/sindresorhus/os-locale',
	'https://github.com/sindresorhus/execa',
	'https://github.com/sindresorhus/pify',
	'https://github.com/sindresorhus/boxen',
	'https://github.com/sindresorhus/make-dir',
	'https://github.com/SamVerschueren/listr',
	'https://github.com/SamVerschueren/listr-update-renderer',
	'https://github.com/SamVerschueren/clinton',
	'https://github.com/SamVerschueren/bragg',
	'https://github.com/SamVerschueren/bragg-router',
	'https://github.com/SamVerschueren/dev-time',
	'https://github.com/SamVerschueren/decode-uri-component',
	'https://github.com/kevva/to-ico',
	'https://github.com/kevva/download',
	'https://github.com/kevva/brightness',
	'https://github.com/kevva/decompress',
	'https://github.com/kevva/npm-conf',
	'https://github.com/imagemin/imagemin',
	'https://github.com/qix-/color-convert',
	'https://github.com/sindresorhus/ky',
	'https://github.com/sindresorhus/query-string',
	'https://github.com/sindresorhus/meow',
	'https://github.com/sindresorhus/globby',
	'https://github.com/sindresorhus/emittery',
	{
		repository: 'https://github.com/sindresorhus/p-queue',
		extraArguments: typescriptArguments
	},
	'https://github.com/sindresorhus/pretty-bytes',
	'https://github.com/sindresorhus/normalize-url',
	{
		repository: 'https://github.com/sindresorhus/pageres',
		extraArguments: typescriptArguments
	},
	{
		repository: 'https://github.com/sindresorhus/got',
		extraArguments: typescriptArguments
	},
	'https://github.com/eslint/eslint',
	'https://github.com/prettier/prettier',
	'https://github.com/facebook/react',
	{
		repository: 'https://github.com/angular/angular',
		extraArguments: [
			...typescriptArguments,

			'--ignore-pattern',
			'aio/content/examples/animations/src/app/open-close.component.3.ts',

			'--ignore-pattern',
			'aio/tools/transforms/templates/data-module.template.js',

			'--ignore-pattern',
			'aio/content/examples/router/src/app/app-routing.module.9.ts'
		]
	},
	{
		repository: 'https://github.com/microsoft/typescript',
		extraArguments: typescriptArguments
	},
	{
		repository: 'https://github.com/microsoft/vscode',
		extraArguments: typescriptArguments
	},
	{
		repository: 'https://github.com/ElemeFE/element',
		extraArguments: vueArguments
	},
	{
		repository: 'https://github.com/iview/iview',
		extraArguments: vueArguments
	},
	'https://github.com/sindresorhus/create-dmg',
	'https://github.com/sindresorhus/cp-file',
	'https://github.com/sindresorhus/capture-website',
	'https://github.com/sindresorhus/file-type',
	'https://github.com/sindresorhus/slugify',
	'https://github.com/gatsbyjs/gatsby',
	{
		repository: 'https://github.com/puppeteer/puppeteer',
		extraArguments: [
			// Parser error on `await page.evaluate(() => delete Node);`
			// https://github.com/puppeteer/puppeteer/blob/0b1a9ceee2f05f534f0d50079ece172d627a93c7/test/jshandle.spec.js#L151
			'--ignore-pattern',
			'test/jshandle.spec.js',

			// `package` keyword
			// https://github.com/puppeteer/puppeteer/blob/0b1a9ceee2f05f534f0d50079ece172d627a93c7/utils/apply_next_version.js#L17
			'--ignore-pattern',
			'utils/apply_next_version.js'
		]
	},
	{
		repository: 'https://github.com/zeit/next.js',
		extraArguments: [
			...typescriptArguments,

			'--ignore-pattern',
			'examples/**'
		]
	},
	'https://github.com/chakra-ui/chakra-ui',
	'https://github.com/ReactTraining/react-router',
	'https://github.com/facebook/relay',
	'https://github.com/mozilla/pdf.js'
].map(project => {
	if (typeof project === 'string') {
		project = {repository: project};
	}

	const {
		repository,
		name = repository.split('/').pop(),
		path = '',
		extraArguments = []
	} = project;

	return {
		...project,
		name,
		repository,
		path,
		extraArguments
	};
});
