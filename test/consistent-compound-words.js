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

test.snapshot({
	valid: [
		'const password = 1;',
		'const isInViewport = true;',
		'function unsubscribe() {}',
		'class ViewportState {}',
		'const fileName = "index.js";',
		'const setUp = () => {};',
		'const lookUp = new Map();',
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
	],
	invalid: [
		'const passWord = 1;',
		'const userName = passWord;',
		'let isInViewPort = true;',
		'function unSubscribe() {}',
		'const dataBase = connect();',
		'const payLoad = {};',
		'const placeHolder = "Name";',
		'const preView = render();',
		'const overRide = true;',
		'const isOnLine = navigator.onLine;',
		'const isOffLine = !navigator.onLine;',
		'const callBack = () => {};',
		'const weekEnd = new Date();',
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
