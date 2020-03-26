'use strict';

const typescriptArguments = ['--parser', '@typescript-eslint/parser', '--ext', '.ts'];
const vueArguments = ['--parser', 'vue-eslint-parser', '--ext', '.vue'];

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
	'http://github.com/SamVerschueren/listr',
	'http://github.com/SamVerschueren/listr-update-renderer',
	'http://github.com/SamVerschueren/clinton',
	'http://github.com/SamVerschueren/bragg',
	'http://github.com/SamVerschueren/bragg-router',
	'http://github.com/SamVerschueren/dev-time',
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
	// TODO: Add this project when #561 got fixed
	// {
	// 	repository: 'https://github.com/eslint/eslint',
	// 	path: 'lib'
	// },
	{
		repository: 'https://github.com/prettier/prettier',
		path: 'src'
	},
	{
		repository: 'https://github.com/facebook/react',
		path: 'packages'
	},
	{
		repository: 'https://github.com/angular/angular',
		path: 'packages',
		extraArguments: typescriptArguments
	},
	{
		repository: 'https://github.com/microsoft/typescript',
		path: 'src',
		extraArguments: typescriptArguments
	},
	// TODO: Add this project when `@typescript-eslint/parser` support `Type-Only Imports and Export`
	// {
	// 	repository: 'https://github.com/microsoft/vscode',
	// 	path: 'src/vs',
	// 	extraArguments: typescriptArguments
	// },
	{
		repository: 'https://github.com/ElemeFE/element',
		path: 'packages',
		extraArguments: vueArguments
	},
	{
		repository: 'https://github.com/iview/iview',
		path: 'src',
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
		path: 'lib'
	},
	{
		repository: 'https://github.com/zeit/next.js',
		path: 'packages',
		extraArguments: typescriptArguments
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
