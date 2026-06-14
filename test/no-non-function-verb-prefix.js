import {fileURLToPath} from 'node:url';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const fixtureDirectory = fileURLToPath(new URL('fixtures/no-non-function-verb-prefix/', import.meta.url));

const typeAware = testCase => ({
	...(typeof testCase === 'string' ? {code: testCase} : testCase),
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			tsconfigRootDir: fixtureDirectory,
			projectService: {
				allowDefaultProject: ['*.ts'],
				defaultProject: 'tsconfig.json',
			},
		},
	},
});

test.snapshot({
	valid: [
		// JavaScript and TypeScript without type information are no-ops.
		'const getName = "name";',
		{code: 'const getName = "name";', filename: 'file.ts', languageOptions: {parser: parsers.typescript}},

		typeAware('const name = "name";'),
		typeAware('const getter = "name";'),
		typeAware('const get_name = "name";'),
		typeAware('const GET_NAME = "name";'),
		typeAware('const getName = () => name;'),
		typeAware('function getName() { return "name"; }'),
		typeAware('const getName: () => string = () => "name";'),
		typeAware('declare const callback: Function; const getName: Function = callback;'),
		typeAware('declare const callback: CallableFunction; const getName: CallableFunction = callback;'),
		typeAware('declare const Constructor: NewableFunction; const createName: NewableFunction = Constructor;'),
		typeAware('declare const getName: () => string;'),
		typeAware('const getName: (() => string) | undefined = undefined;'),
		typeAware('const getName: (() => string) & {property: string} = Object.assign(() => "name", {property: "name"});'),
		typeAware('declare const makeFactory: () => () => string; const getName = makeFactory();'),
		typeAware('class Pizza {} const createPizza: typeof Pizza = Pizza;'),
		typeAware('const object = {getName: "name"};'),
		typeAware('const object = {getName() { return "name"; }};'),
		typeAware('class Person { getName() { return "name"; } }'),
		typeAware('class Person { get getName() { return "name"; } }'),
		typeAware('class Person { set setName(value: string) {} }'),
		typeAware('class Person { declare getName: string; }'),
		typeAware('abstract class Person { abstract getName: string; }'),
		typeAware('declare class Person { getName: string; }'),
		typeAware('class Person { getName = () => "name"; }'),
		typeAware('class Person { #getName = () => "name"; }'),
		typeAware('class Person { accessor getName = () => "name"; }'),
		typeAware('const {getName: name} = object as {getName: string};'),
		typeAware('function run<T>(getName: T) { return getName; }'),
		typeAware('function run<T extends () => string>(getName: T) { return getName; }'),
		typeAware('function run(getName: unknown) { return getName; }'),
		typeAware('function run(getName: any) { return getName; }'),
		typeAware('declare const getName: never;'),
		typeAware('declare const getName: string;'),
		typeAware('const enum getName { value }'),
		typeAware('declare enum getName { value }'),
		typeAware('declare namespace Foo { const getName: string; class Person { getName: string; accessor setName: string; } enum createName { value } }'),
		typeAware('declare module "foo" { const getName: string; class Person { getName: string; } }'),
		typeAware('import type getName from "./module";'),
		typeAware('import type {getName} from "module";'),
		typeAware('import {type name as getName} from "./module";'),
		typeAware('import type getModule = require("./module");'),
		typeAware('const buildName = "name";'),
		typeAware({
			code: 'const buildName = "name";',
			options: [{verbs: ['compile']}],
		}),
		typeAware('const getName = undefined;'),
	],
	invalid: [
		typeAware('const getName = "name";'),
		typeAware('class Pizza {} const createPizza = new Pizza();'),
		typeAware('const removeItem: Promise<void> = Promise.resolve();'),
		typeAware('function run(getName: string) { return getName; }'),
		typeAware('function run({getName}: {getName: string}) { return getName; }'),
		typeAware('class Person { constructor(public getName: string) {} }'),
		typeAware('const {getName} = object as {getName: string};'),
		typeAware('const {foo: getName} = object as {foo: string};'),
		typeAware('class Person { getName = "name"; }'),
		typeAware('class Person { #getName = "name"; }'),
		typeAware('class Person { accessor getName = "name"; }'),
		typeAware('class Person { getName: object = () => "name"; }'),
		typeAware('let getName: string | (() => string);'),
		typeAware('import getName from "./module";'),
		typeAware('import {name as getName} from "./module";'),
		typeAware('import * as getModule from "./module";'),
		typeAware('import getModule = require("./module");'),
		typeAware('function run<T extends string>(getName: T) { return getName; }'),
		typeAware('enum getName { value }'),
		typeAware('const addItem = 1;'),
		typeAware('const deleteItem = true;'),
		typeAware('const setItem = 1;'),
		typeAware('const unsetItem = 1;'),
		typeAware('const destroyItem = 1;'),
		typeAware({
			code: 'const buildName = "name";',
			options: [{verbs: ['build']}],
		}),
	],
});
