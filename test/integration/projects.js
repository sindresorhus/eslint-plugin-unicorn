'use strict';
const path = require('path');

module.exports = [
	{
		name: 'fixtures-local',
		location: path.join(__dirname, 'fixtures-local')
	},
	{
		repository: 'https://github.com/avajs/ava',
		ignore: [
			'test/node_modules'
		]
	},
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
	'https://github.com/sindresorhus/p-queue',
	'https://github.com/sindresorhus/pretty-bytes',
	'https://github.com/sindresorhus/normalize-url',
	'https://github.com/sindresorhus/pageres',
	{
		repository: 'https://github.com/sindresorhus/got',
		ignore: [
			// This file use `package` keyword as variable
			'documentation/examples/gh-got.js'
		]
	},
	'https://github.com/eslint/eslint',
	{
		repository: 'https://github.com/prettier/prettier',
		ignore: [
			'tests/**'
		]
	},
	'https://github.com/facebook/react',
	{
		repository: 'https://github.com/angular/angular',
		ignore: [
			'aio/content/examples/animations/src/app/open-close.component.3.ts',
			'aio/content/examples/router/src/app/app-routing.module.9.ts',
			'aio/tools/transforms/templates/data-module.template.js',
			'aio/tools/transforms/authors-package/index.js', // This file use `package` keyword as variable
			'packages/compiler-cli/test/**',
			'tools/**'
		]
	},
	{
		repository: 'https://github.com/microsoft/typescript',
		ignore: [
			// These file use `'\033'`
			'build/**'
		]
	},
	{
		repository: 'https://github.com/microsoft/vscode',
		ignore: [
			// This file use `'\033'`
			'build/**'
		]
	},
	'https://github.com/ElemeFE/element',
	'https://github.com/iview/iview',
	'https://github.com/sindresorhus/create-dmg',
	'https://github.com/sindresorhus/cp-file',
	'https://github.com/sindresorhus/capture-website',
	'https://github.com/sindresorhus/file-type',
	'https://github.com/sindresorhus/slugify',
	'https://github.com/gatsbyjs/gatsby',
	{
		repository: 'https://github.com/puppeteer/puppeteer',
		ignore: [
			// Parser error on `await page.evaluate(() => delete Node);`
			// https://github.com/puppeteer/puppeteer/blob/0b1a9ceee2f05f534f0d50079ece172d627a93c7/test/jshandle.spec.js#L151
			'test/jshandle.spec.js',

			// `package` keyword
			// https://github.com/puppeteer/puppeteer/blob/0b1a9ceee2f05f534f0d50079ece172d627a93c7/utils/apply_next_version.js#L17
			'utils/apply_next_version.js'
		]
	},
	{
		repository: 'https://github.com/vercel/next.js',
		ignore: [
			'examples/**',

			// These files use `>` in jsx
			'test/integration/**'
		]
	},
	{
		repository: 'https://github.com/chakra-ui/chakra-ui',
		ignore: [
			'scripts/create-package.js' // This file use `package` keyword as variable
		]
	},
	'https://github.com/ReactTraining/react-router',
	'https://github.com/facebook/relay',
	'https://github.com/mozilla/pdf.js',
	// #912
	{
		repository: 'https://github.com/microsoft/fluentui',
		ignore: [
			'scripts/publish-beta.js' // This file use `package` keyword as variable
		]
	},
	// #902
	{
		repository: 'https://github.com/reakit/reakit',
		ignore: [
			'packages/reakit/jest.config.js' // This file use `package` keyword as variable
		]
	},
	// #903
	'https://github.com/mattermost/mattermost-webapp',
	// #1030
	'https://github.com/astrofox-io/astrofox',
	// #1075
	'https://github.com/jaredLunde/masonic'
].map(project => {
	if (typeof project === 'string') {
		project = {repository: project};
	}

	const {
		repository,
		name = repository.split('/').pop(),
		ignore = []
	} = project;

	return {
		...project,
		name,
		repository,
		ignore
	};
});
