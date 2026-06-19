/* eslint sort-keys: ["error", "asc", {"caseSensitive": false}] */

export const defaultReplacements = {
	acc: {
		accumulator: true,
	},
	application: {
		app: true,
	},
	applications: {
		apps: true,
	},
	arg: {
		argument: true,
	},
	args: {
		arguments: true,
	},
	arr: {
		array: true,
	},
	attr: {
		attribute: true,
	},
	attrs: {
		attributes: true,
	},
	btn: {
		button: true,
	},
	buf: {
		buffer: true,
	},
	cb: {
		callback: true,
	},
	cfg: {
		config: true,
	},
	cmd: {
		command: true,
	},
	conf: {
		config: true,
	},
	configuration: {
		config: true,
	},
	ctx: {
		context: true,
	},
	cur: {
		current: true,
	},
	curr: {
		current: true,
	},
	db: {
		database: true,
	},
	decl: {
		declaration: true,
	},
	decls: {
		declarations: true,
	},
	def: {
		defer: true,
		deferred: true,
		define: true,
		definition: true,
	},
	dep: {
		dependency: true,
	},
	deps: {
		dependencies: true,
	},
	dest: {
		destination: true,
	},
	dev: {
		development: true,
	},
	dir: {
		direction: true,
		directory: true,
	},
	dirs: {
		directories: true,
	},
	dist: {
		distribution: true,
	},
	doc: {
		document: true,
	},
	docs: {
		documentation: true,
		documents: true,
	},
	dst: {
		daylightSavingTime: true,
		destination: true,
		distribution: true,
	},
	e: {
		error: true,
		event: true,
	},
	el: {
		element: true,
	},
	elem: {
		element: true,
	},
	elems: {
		elements: true,
	},
	env: {
		environment: true,
	},
	envs: {
		environments: true,
	},
	err: {
		error: true,
	},
	ev: {
		event: true,
	},
	evt: {
		event: true,
	},
	expr: {
		expression: true,
	},
	exprs: {
		expressions: true,
	},
	ext: {
		extension: true,
	},
	exts: {
		extensions: true,
	},
	fn: {
		function: true,
	},
	func: {
		function: true,
	},
	i: {
		index: true,
	},
	ident: {
		identifier: true,
	},
	idents: {
		identifiers: true,
	},
	idx: {
		index: true,
	},
	j: {
		index: true,
	},
	len: {
		length: true,
	},
	lib: {
		library: true,
	},
	mod: {
		module: true,
	},
	msg: {
		message: true,
	},
	num: {
		number: true,
	},
	obj: {
		object: true,
	},
	opts: {
		options: true,
	},
	param: {
		parameter: true,
	},
	params: {
		parameters: true,
	},
	perf: {
		performance: true,
	},
	pkg: {
		package: true,
	},
	prev: {
		previous: true,
	},
	prod: {
		production: true,
	},
	prop: {
		property: true,
	},
	props: {
		properties: true,
	},
	proto: {
		prototype: true,
	},
	ref: {
		reference: true,
	},
	refs: {
		references: true,
	},
	rel: {
		related: true,
		relationship: true,
		relative: true,
	},
	repository: {
		repo: true,
	},
	req: {
		request: true,
	},
	res: {
		resource: true,
		response: true,
		result: true,
	},
	ret: {
		returnValue: true,
	},
	retval: {
		returnValue: true,
	},
	sep: {
		separator: true,
	},
	src: {
		source: true,
	},
	stdDev: {
		standardDeviation: true,
	},
	stmt: {
		statement: true,
	},
	stmts: {
		statements: true,
	},
	str: {
		string: true,
	},
	tbl: {
		table: true,
	},
	temp: {
		temporary: true,
	},
	tit: {
		title: true,
	},
	tmp: {
		temporary: true,
	},
	util: {
		utility: true,
	},
	utils: {
		utilities: true,
	},
	val: {
		value: true,
	},
	var: {
		variable: true,
	},
	vars: {
		variables: true,
	},
	ver: {
		version: true,
	},
};

export const defaultAllowList = {
	// React.Component Class property
	// https://reactjs.org/docs/react-component.html#defaultprops
	defaultProps: true,
	// `package.json` field
	// https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file
	devDependencies: true,
	// Ember class name
	// https://api.emberjs.com/ember/3.10/classes/Ember.EmberENV/properties
	EmberENV: true,
	// React.Component static method
	// https://reactjs.org/docs/react-component.html#static-getderivedstatefromprops
	getDerivedStateFromProps: true,
	// Next.js function
	// https://nextjs.org/learn/basics/fetching-data-for-pages
	getInitialProps: true,
	getServerSideProps: true,
	getStaticProps: true,
	// Vite environment variables type
	// https://vite.dev/guide/env-and-mode#intellisense-for-typescript
	ImportMetaEnv: true,
	// The name iOS is a standard name for an OS
	iOS: true,
	// React PropTypes
	// https://reactjs.org/docs/typechecking-with-proptypes.html
	propTypes: true,
	// Jest configuration
	// https://jestjs.io/docs/en/configuration#setupfilesafterenv-array
	setupFilesAfterEnv: true,
};

export const defaultIgnore = [
	// Internationalization and localization
	// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1188
	'i18n',
	'l10n',
	'a11y', // Accessibility
	'e2e', // End-to-end
	'jQuery',
	// Vite type declaration file
	// https://vite.dev/guide/env-and-mode#intellisense-for-typescript
	'vite-env',
];
