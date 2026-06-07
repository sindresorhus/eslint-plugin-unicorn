import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

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

const customOptions = [
	{
		extendDefaultReplacements: false,
		replacements: {
			fooBar: 'foobar',
		},
	},
];

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

test.snapshot({
	valid: [
		'const password = 1;',
		'const isInViewport = true;',
		'function unsubscribe() {}',
		'class ViewportState {}',
		'const fileName = "index.js";',
		'const setUp = () => {};',
		'const lookUp = new Map();',
		'const timeOut = 1000;',
		'const dropDown = element;',
		'const popUp = window.open();',
		'const webSocket = new WebSocket(url);',
		'const sourceMap = parseSourceMap();',
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
			code: 'const isOnline = navigator.onLine;',
			options: checkPropertiesOptions,
		},
		{
			code: 'document.styleSheet = styleSheet;',
			options: checkPropertiesOptions,
		},
		{
			code: 'const superClass = node.superClass;',
			options: checkPropertiesOptions,
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
		'const homePage = url;',
		'const keyBoard = inputDevice;',
		'const keyFrame = animation.frames[0];',
		'const metaData = new Map();',
		'const nameSpace = "svg";',
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
		'const editorToolBar = editor.toolbar;',
		'const toolTip = button.title;',
		'const touchScreen = matchMedia("(pointer: coarse)");',
		'const underScore = "_";',
		'const webHook = createWebhook();',
		'const workSpace = await openWorkspace();',
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

test.snapshot(withJsx({
	valid: [
		'<input passWord="current" />',
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
