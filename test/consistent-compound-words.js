import outdent from 'outdent';
import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const checkPropertiesOptions = [
	{
		checkProperties: true,
	},
];

const checkImportsOptions = [
	{
		checkDefaultAndNamespaceImports: true,
		checkShorthandImports: true,
	},
];

const checkShorthandPropertiesOptions = [
	{
		checkShorthandProperties: true,
	},
];

const onlyCheckPropertiesOptions = [
	{
		checkProperties: true,
		checkVariables: false,
	},
];

const customOptions = [
	{
		extendDefaultReplacements: false,
		replacements: {
			fooBar: 'foobar',
		},
	},
];

const propertyError = {
	messageId: 'consistent-compound-words/error',
};

const withJsx = tests => ({
	...tests,
	testerOptions: {
		...tests.testerOptions,
		languageOptions: {
			...tests.testerOptions?.languageOptions,
			parserOptions: {
				...tests.testerOptions?.languageOptions?.parserOptions,
				ecmaFeatures: {
					...tests.testerOptions?.languageOptions?.parserOptions?.ecmaFeatures,
					jsx: true,
				},
			},
		},
	},
});

ruleTest.snapshot({
	valid: [
		'const password = 1;',
		'const isInViewport = true;',
		'function unsubscribe() {}',
		'class ViewportState {}',
		'const fileName = "index.js";',
		'const setUp = () => {};',
		'const lookUp = new Map();',
		'const dropDown = element;',
		'const popUp = window.open();',
		'const webSocket = new WebSocket(url);',
		'const sourceMap = parseSourceMap();',
		'const homePage = url;',
		'function HomePage() {}',
		'const runTime = performance.now() - start;',
		'const isOnLine = isOnlyNodeOnLine(node);',
		'const isOffLine = position.column === 0;',
		'const styleSheet = document.styleSheets[0];',
		'const CSSStyleSheetConstructor = CSSStyleSheet;',
		'const superClass = node.superClass;',
		'const superClassName = getSuperClassName(node.superClass);',
		'const VIEW_PORT = 1;',
		'const XMLHttpRequest = 1;',
		'const payload = 1;',
		'const compassWord = 1;',
		'const myViewPortion = 1;',
		'const endPoint = line.end;',
		'const postFix = patch.after;',
		'const preFix = patch.before;',
		'const protoType = schema.type;',
		'const roadMap = atlas.getRoadMap();',
		'const foo_userName = 1;',
		'const version2userName = 1;',
		'class ViewPortion {}',
		'({passWord: 1})',
		'foo.userName = 1;',
		'import userName from "user-name";',
		'import {userName} from "user-name";',
		'const {userName} = object;',
		{
			code: 'const userName = 1;',
			options: [{
				allowList: {
					userName: true,
				},
			}],
		},
		{
			code: 'const passWord = 1;',
			options: [{
				replacements: {
					passWord: false,
				},
			}],
		},
		{
			code: 'const passWord = 1;',
			options: [{
				extendDefaultReplacements: false,
				replacements: {},
			}],
		},
		{
			code: 'const fooBar = 1;',
			options: [{
				extendDefaultReplacements: true,
				replacements: {
					fooBar: false,
				},
			}],
		},
		{
			code: 'navigator.onLine = isOnline;',
			options: checkPropertiesOptions,
		},
		{
			code: 'document.styleSheet = styleSheet;',
			options: checkPropertiesOptions,
		},
		{
			code: 'class Foo { superClass = Base; }',
			options: checkPropertiesOptions,
		},
		{
			code: 'const options = {"timeOut": 1000};',
			options: checkPropertiesOptions,
		},
		{
			code: 'const styles = {"--tool-tip-color": "red"};',
			options: checkPropertiesOptions,
		},
		{
			code: 'foo[timeOut] = 1;',
			options: onlyCheckPropertiesOptions,
		},
	],
	invalid: [
		'const backGround = 1;',
		'const passWord = 1;',
		'const userName = passWord;',
		'let isInViewPort = true;',
		'function unSubscribe() {}',
		'const dataBase = connect();',
		'const payLoad = {};',
		'const placeHolder = "Name";',
		'const preView = render();',
		'const overRide = true;',
		'const callBack = () => {};',
		'const weekEnd = new Date();',
		'const checkBox = element;',
		'const clipBoard = navigator.clipboard;',
		'const codeBase = project.root;',
		'const downLoad = fetchArchive();',
		'const feedBack = getReviewComment();',
		'const foreGround = getActiveWindow();',
		'const frameWork = loadPluginHost();',
		'const headLine = article.title;',
		'const keyBoard = inputDevice;',
		'const keyFrame = animation.frames[0];',
		'const lifeCycle = hooks;',
		'const metaData = new Map();',
		'const midPoint = (start + end) / 2;',
		'const nameSpace = "svg";',
		String.raw`const newLine = "\n";`,
		'const screenShot = await page.screenshot();',
		'const sideBar = document.querySelector(".sidebar");',
		'const subClass = class extends Parent {};',
		'const subDirectory = path.join(directory, "child");',
		'const subDomain = "api";',
		'const subMenu = menu.items[0];',
		'const subProcess = spawn(command);',
		'const subString = value.slice(1);',
		'const subTree = tree.children[0];',
		'const subType = type.kind;',
		'const subTitle = section.subtitle;',
		'const timeOut = 1000;',
		'const timeStamp = Date.now();',
		'const editorToolBar = editor.toolbar;',
		'const toolKit = createToolbox();',
		'const toolTip = button.title;',
		'const touchScreen = matchMedia("(pointer: coarse)");',
		'const underScore = "_";',
		'const upLoad = sendFile(file);',
		'const webCam = await getCamera();',
		'const webHook = createWebhook();',
		'const webSite = new URL(url);',
		'const workSpace = await openWorkspace();',
		'const whiteSpace = " ";',
		'const wildCard = "*";',
		'const workFlow = await loadWorkflow();',
		'const passWordAndUserName = 1;',
		'const myPassWord = 1;',
		'class ViewPortState {}',
		outdent`
			const userName = 'Ada';
			console.log(userName);
		`,
		outdent`
			function getUserName(userName) {
				return userName;
			}
		`,
		{
			code: '({passWord: 1})',
			options: checkPropertiesOptions,
		},
		{
			code: 'foo.userName = 1;',
			options: checkPropertiesOptions,
		},
		{
			code: 'class Foo { viewPort = 1; }',
			options: checkPropertiesOptions,
		},
		{
			code: 'foo.userName++;',
			options: checkPropertiesOptions,
		},
		{
			code: '++foo.userName;',
			options: checkPropertiesOptions,
		},
		{
			code: 'class Foo { #passWord = 1; }',
			options: checkPropertiesOptions,
		},
		{
			code: 'event.timeStamp = Date.now();',
			options: checkPropertiesOptions,
		},
		{
			code: 'element.style.whiteSpace = "pre";',
			options: checkPropertiesOptions,
		},
		'import userName from "./user-name.js";',
		'import * as userName from "./user-name.js";',
		'const userName = require("./user-name.js");',
		{
			code: 'import userName from "user-name";',
			options: checkImportsOptions,
		},
		{
			code: 'import {userName} from "user-name";',
			options: checkImportsOptions,
		},
		{
			code: 'const {userName} = object;',
			options: checkShorthandPropertiesOptions,
		},
		{
			code: 'const fooBar = 1;',
			options: customOptions,
		},
		outdent`
			const username = 1;
			const userName = 2;
			console.log(username, userName);
		`,
		{
			code: outdent`
				foo.userName = 1;
				console.log(foo.userName);
			`,
			options: checkPropertiesOptions,
		},
		{
			code: 'const FooBar = 1;',
			options: [{
				extendDefaultReplacements: false,
				replacements: {
					FooBar: 'Foobar',
				},
			}],
		},
		{
			code: 'const fooBar = 1;',
			options: [{
				extendDefaultReplacements: false,
				replacements: {
					fooBar: 'foo-bar',
				},
			}],
		},
	],
});

ruleTest.snapshot(withJsx({
	valid: [
		'<input passWord="current" />',
		{
			code: '<input passWord="current" />',
			options: checkPropertiesOptions,
		},
		'<passWord />',
	],
	invalid: [
		outdent`
			const passWord = 'secret';
			const element = <input value={passWord} />;
		`,
		outdent`
			function UserNameField() {}
			const element = <UserNameField />;
		`,
	],
}));

ruleTest.typescript({
	valid: [],
	invalid: [
		{
			code: 'abstract class Foo { abstract viewPort: string; }',
			options: checkPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'abstract class Foo { abstract passWord(): void; }',
			options: checkPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'class Foo { accessor userName = 1; }',
			options: checkPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'class Foo { abstract accessor userName: string; }',
			options: checkPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'class Foo { #passWord = 1; }',
			options: checkPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'interface Foo { userName: string; }',
			options: onlyCheckPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'type Foo = { passWord(): void; }',
			options: onlyCheckPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'class Foo { constructor(private userName: string) {} }',
			options: onlyCheckPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'class Foo { constructor(private userName = "") {} }',
			options: onlyCheckPropertiesOptions,
			errors: [propertyError],
		},
		{
			code: 'class Foo { constructor(private userName: string) {} }',
			options: checkPropertiesOptions,
			errors: [{
				...propertyError,
				suggestions: [{
					messageId: 'consistent-compound-words/rename',
					output: 'class Foo { constructor(private username: string) {} }',
				}],
			}],
		},
		{
			code: 'class Foo { constructor(private userName = "") {} }',
			options: checkPropertiesOptions,
			errors: [{
				...propertyError,
				suggestions: [{
					messageId: 'consistent-compound-words/rename',
					output: 'class Foo { constructor(private username = "") {} }',
				}],
			}],
		},
	],
});

test('validates options schema', t => {
	const linter = new Linter({configType: 'flat'});

	const verify = options => linter.verify('const userName = 1;', {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: {
			unicorn,
		},
		rules: {
			'unicorn/consistent-compound-words': [
				'error',
				options,
			],
		},
	});

	t.throws(
		() => verify({checkDefaultAndNamespaceImports: 'not-internal'}),
		{message: /Value "not-internal" should match some schema in anyOf/u},
	);
	t.throws(
		() => verify({checkShorthandImports: 'not-internal'}),
		{message: /Value "not-internal" should match some schema in anyOf/u},
	);
	t.throws(
		() => verify({replacements: {fooBar: ''}}),
		{message: /Value "" should NOT be shorter than 1 characters/u},
	);
	t.throws(
		() => verify({replacements: {'': 'empty'}}),
		{message: /property name '' is invalid/u},
	);
	t.throws(
		() => verify({allowList: {'': true}}),
		{message: /property name '' is invalid/u},
	);
	t.throws(
		() => verify({allowList: {userName: false}}),
		{message: /Value false should be equal to one of the allowed values/u},
	);
	t.throws(
		() => verify({extendDefaultAllowList: false}),
		{message: /Unexpected property "extendDefaultAllowList"/u},
	);
});
