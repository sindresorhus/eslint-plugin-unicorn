import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescript = testCase => ({
	...(typeof testCase === 'string' ? {code: testCase} : testCase),
	languageOptions: {
		parser: parsers.typescript,
	},
});

test.snapshot({
	valid: [
		'function parse(value) { return value; }',
		'const parse = value => value;',
		'export const parse = value => value;',
		'let transform = value => value; transform = wrap(transform);',
		'items.map(item => item.id);',
		'items.map(function (item) { return item.id; });',
		'new Map(function () {});',
		'const object = {parse(value) { return value; }};',
		'const object = {parse: value => value};',
		'const object = {parse: function (value) { return value; }};',
		'(function () {})();',
		'(() => {})();',
		'export default () => {};',
		'export default function parse() {}',
		'class Parser {parse(value) { return value; }}',
		'class Parser {parse = value => value;}',
		'const {parse = value => value} = object;',
		{
			code: 'const object = {get parse() { return value; }, set parse(value) {}};',
			options: [{objectProperties: 'method'}],
		},
		{
			code: 'const parse = value => value; export {parse};',
			options: [{namedFunctions: 'ignore', namedExports: 'declaration'}],
		},
		{
			code: 'function * parse() { yield value; }',
			options: [{namedFunctions: 'arrow-function'}],
		},
		typescript('const parse: Parser = value => value;'),
		typescript('function parse(value: string): string;'),
		typescript(outdent`
			function parse(value: string): string;
			function parse(value: string) {
				return value;
			}
		`),
		typescript({
			code: 'export const parse: Parser = value => value;',
			options: [{namedExports: 'declaration'}],
		}),
	],
	invalid: [
		{
			code: 'const parse = value => value;',
			options: [{namedFunctions: 'declaration'}],
		},
		{
			code: 'const parse = function (value) { return value; };',
			options: [{namedFunctions: 'declaration'}],
		},
		{
			code: 'export const parse = value => value;',
			options: [{namedExports: 'declaration'}],
		},
		{
			code: 'export const parse = function (value) { return value; };',
			options: [{namedExports: 'declaration'}],
		},
		{
			code: 'items.map(function (item) { return item.id; });',
			options: [{callbacks: 'arrow-function'}],
		},
		{
			code: 'new Map(function () {});',
			options: [{callbacks: 'arrow-function'}],
		},
		{
			code: 'items.map(item => item.id);',
			options: [{callbacks: 'function-expression'}],
		},
		{
			code: 'items.map(async item => item.id);',
			options: [{callbacks: 'function-expression'}],
		},
		{
			code: 'items.map(item => ({id: item.id}));',
			options: [{callbacks: 'function-expression'}],
		},
		{
			code: 'items.map(function item(value) { return item(value); });',
			options: [{callbacks: 'arrow-function'}],
		},
		{
			code: 'items.map(function (item) { return this.parse(item); });',
			options: [{callbacks: 'arrow-function'}],
		},
		{
			code: 'items.map(function (item = this.defaultItem) { return item.id; });',
			options: [{callbacks: 'arrow-function'}],
		},
		{
			code: 'items.map(item => this.parse(item));',
			options: [{callbacks: 'function-expression'}],
		},
		{
			code: 'items.map((item = arguments[0]) => item.id);',
			options: [{callbacks: 'function-expression'}],
		},
		{
			code: 'items.map(function (item) { /* comment */ return item.id; });',
			options: [{callbacks: 'arrow-function'}],
		},
		{
			code: 'condition ? function () {} : undefined;',
			options: [{default: 'arrow-function'}],
		},
		{
			code: 'const object = {parse(value) { return value; }};',
			options: [{objectProperties: 'arrow-function'}],
		},
		{
			code: 'const object = {parse: function (value) { return value; }};',
			options: [{objectProperties: 'method'}],
		},
		{
			code: 'const object = {parse: value => value};',
			options: [{objectProperties: 'method'}],
		},
		{
			code: 'let transform = value => value; transform = wrap(transform);',
			options: [{reassignedVariables: 'function-expression'}],
		},
		{
			code: 'let transform = function (value) { return value; }; transform = wrap(transform);',
			options: [{reassignedVariables: 'arrow-function'}],
		},
		{
			code: 'function parse(value) { return value; }',
			options: [{namedFunctions: 'arrow-function'}],
		},
		{
			code: 'const parse = value => value;',
			options: [{namedFunctions: 'function-expression'}],
		},
		{
			code: 'const parse = function (value) { return value; };',
			options: [{namedFunctions: 'arrow-function'}],
		},
		{
			code: 'export function parse(value) { return value; }',
			options: [{namedExports: 'arrow-function'}],
		},
		{
			code: 'export default function parse(value) { return value; }',
			options: [{namedFunctions: 'arrow-function'}],
		},
		typescript({
			code: 'const parse: Parser = function (value) { return value; };',
			options: [{typedVariables: 'arrow-function'}],
		}),
		typescript({
			code: 'const parse: Parser = value => value;',
			options: [{typedVariables: 'function-expression'}],
		}),
		typescript({
			code: 'export const parse: Parser = value => value;',
			options: [{typedVariables: 'function-expression', namedExports: 'declaration'}],
		}),
	],
});
