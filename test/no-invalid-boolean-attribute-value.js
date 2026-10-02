import test from 'ava';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest({
	valid: [],
	invalid: [{
		code: 'const button = document.createElement("button"); button.setAttribute("disabled", "false");',
		errors: [{
			messageId: 'no-invalid-boolean-attribute-value',
			data: {attribute: 'disabled'},
			suggestions: [{
				messageId: 'no-invalid-boolean-attribute-value/remove',
				data: {attribute: 'disabled'},
				output: 'const button = document.createElement("button"); button.removeAttribute("disabled");',
			}],
		}],
	}],
});

// Each pair comes from the HTML Standard's boolean attribute index.
const attributeElements = [
	['allowfullscreen', ['iframe']],
	['alpha', ['input']],
	['async', ['script']],
	['autofocus', ['div', 'button']],
	['autoplay', ['audio', 'video']],
	['checked', ['input']],
	['controls', ['audio', 'video', 'img']],
	['default', ['track']],
	['defer', ['script']],
	['disabled', ['button', 'input', 'optgroup', 'option', 'select', 'textarea', 'fieldset', 'link']],
	['formnovalidate', ['button', 'input']],
	['headingreset', ['div']],
	['inert', ['div', 'span']],
	['ismap', ['img']],
	['itemscope', ['div']],
	['loop', ['audio', 'video']],
	['multiple', ['input', 'select']],
	['muted', ['audio', 'video']],
	['nomodule', ['script']],
	['novalidate', ['form']],
	['open', ['details', 'dialog']],
	['playsinline', ['video']],
	['readonly', ['input', 'textarea']],
	['required', ['input', 'select', 'textarea']],
	['reversed', ['ol']],
	['selected', ['option']],
	['shadowrootclonable', ['template']],
	['shadowrootcustomelementregistry', ['template']],
	['shadowrootdelegatesfocus', ['template']],
	['shadowrootserializable', ['template']],
];

const buttonCall = value => `document.createElement('button').setAttribute('disabled', ${value})`;
const typescript = code => ({code, languageOptions: {parser: parsers.typescript}});
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

ruleTest.snapshot({
	valid: [
		...attributeElements.flatMap(([attribute, elements]) => elements.flatMap(element => [
			`document.createElement('${element}').setAttribute('${attribute}', '')`,
			`document.createElement('${element}').setAttribute('${attribute}', '${attribute.toUpperCase()}')`,
		])),
		...attributeElements.filter(([attribute]) => !['autofocus', 'headingreset', 'inert', 'itemscope'].includes(attribute)).map(([attribute]) => `document.createElement('div').setAttribute('${attribute}', 'false')`),
		...['aria-disabled', 'data-disabled', 'hidden', 'draggable', 'contenteditable', 'spellcheck', 'popover', 'download', 'capture'].map(attribute => `document.createElement('button').setAttribute('${attribute}', 'false')`),
		'button.setAttribute("disabled", "false")',
		'({setAttribute() {}}).setAttribute("disabled", "false")',
		'class Foo {#setAttribute() {} foo() {document.createElement("button").#setAttribute("disabled", "false")}}',
		'document.createElement("my-button").setAttribute("disabled", "false")',
		'document.createElement("button", {is: "my-button"}).setAttribute("disabled", "false")',
		'document.createElementNS("http://www.w3.org/2000/svg", "button").setAttribute("disabled", "false")',
		'document.createElementNS(namespace, "button").setAttribute("disabled", "false")',
		'function foo(document) {document.createElement("button").setAttribute("disabled", "false")}',
		'function foo(window) {window.document.createElement("button").setAttribute("disabled", "false")}',
		'function foo(globalThis) {globalThis.document.createElement("button").setAttribute("disabled", "false")}',
		'document.createElement("input").setAttribute("CHECKED", "false")',
		'let button = document.createElement("button"); button.setAttribute("disabled", "false")',
		'const button = getButton(); button.setAttribute("disabled", "false")',
		'const button = alias; const alias = button; button.setAttribute("disabled", "false")',
		'document.createElement(...tags).setAttribute("disabled", "false")',
		'document.createElementNS("http://www.w3.org/1999/xhtml", "BUTTON").setAttribute("disabled", "false")',
		'const button = document.createElement("button"); button.setAttribute(name, "false")',
		...['value', 'getValue()', '{}', '[]', 'Symbol()', 'Symbol.iterator'].map(value => buttonCall(value)),
		...['void sideEffect()', '(sideEffect(), "false")', '({get value() {return "false"}}).value', '"disabled" || unknown'].map(value => buttonCall(value)),
		'let value = "false"; value = ""; document.createElement("button").setAttribute("disabled", value)',
		'document.createElement("button").setAttribute("disabled")',
		'document.createElement("button").setAttribute("disabled", "false", extra)',
		'document.createElement("button").setAttribute(...arguments_)',
		'document.createElement("button").setAttributeNS(null, "disabled", "false")',
		'document.createElement("button")[method]("disabled", "false")',
		...['.button', '#button', 'button, input', 'form button', 'button[disabled]', 'button:hover', '*', 'svg|button', 'my-button', 'button['].map(selector => `document.querySelector('${selector}').setAttribute('disabled', 'false')`),
		...['a', 'script', 'style', 'title'].map(selector => `document.querySelector('${selector}').setAttribute('inert', 'false')`),
		String.raw`document.querySelector("s\\63ript").setAttribute("async", "false")`,
		'document.querySelectorAll("button")[0].setAttribute("disabled", "false")',
		'custom.querySelector("button").setAttribute("disabled", "false")',
		...['Element', 'HTMLElement', 'HTMLDivElement', 'SVGElement', 'unknown', 'any', '{setAttribute(name: string, value: string): void}', 'HTMLButtonElement | HTMLDivElement'].map(type => typescript(`function foo(button: ${type}) {button.setAttribute('disabled', 'false')}`)),
		typescript('class CustomButton extends HTMLButtonElement {} const button = new CustomButton(); button.setAttribute("disabled", "false")'),
		typescript('interface CustomButton extends HTMLButtonElement {} function foo(button: CustomButton) {button.setAttribute("disabled", "false")}'),
		typescript('type Button = Alias; type Alias = Button; function foo(button: Button) {button.setAttribute("disabled", "false")}'),
		typescript('interface HTMLButtonElement {setAttribute(name: string, value: string): void} function foo(button: HTMLButtonElement) {button.setAttribute("disabled", "false")}'),
		typescript('interface HTMLButtonElement {setAttribute(name: string, value: string): void} interface HTMLButtonElement {custom: true} function foo(button: HTMLButtonElement) {button.setAttribute("disabled", "false")}'),
		typescript('const button = document.createElement("my-button") as HTMLElement; button.setAttribute("inert", "false")'),
		typeAware('const button = document.createElement("button", {is: "my-button"}); button.setAttribute("disabled", "false")'),
		typeAware('document.createElementNS("http://www.w3.org/1999/xhtml", "button", {is: "my-button"}).setAttribute("disabled", "false")'),
		typeAware('const script = document.querySelector("script"); script?.setAttribute("async", "false")'),
		typeAware('document.querySelector<HTMLScriptElement>("script")?.setAttribute("async", "false")'),
		typeAware('let script = document.querySelector("script"); script?.setAttribute("async", "false")'),
		typeAware('let script = document.querySelector("script"); const alias = script; alias?.setAttribute("async", "false")'),
		typeAware('var button = document.createElement("button", {is: "my-button"}); button.setAttribute("disabled", "false")'),
		typeAware('const button = document.querySelector("my-button"); button?.setAttribute("inert", "false")'),
		typeAware('class CustomButton extends HTMLButtonElement {} const button = new CustomButton(); button.setAttribute("disabled", "false")'),
		typeAware('interface Contract {setAttribute(name: string, value: string): void} function foo(button: Contract) {button.setAttribute("disabled", "false")}'),
		typeAware('export {}; interface HTMLButtonElement {setAttribute(name: string, value: string): void} function foo(holder: {button: HTMLButtonElement}) {holder.button.setAttribute("disabled", "false")}'),
		typeAware('function foo(holder: {button: HTMLButtonElement | HTMLDivElement}) {holder.button.setAttribute("disabled", "false")}'),
	],
	invalid: [
		...attributeElements.flatMap(([attribute, elements]) => elements.map(element => `document.createElement('${element}').setAttribute('${attribute}', 'true')`)),
		...['false', 'true', '0', '1', '0n', 'null', 'undefined', '"FALSE"', '"true"', '"wrong"', '" disabled "', '"" + false', '`false`', '(false)'].map(value => buttonCall(value)),
		...['false && unknown', 'true ? "false" : unknown'].map(value => buttonCall(value)),
		'document.createElement("BUTTON").setAttribute("DISABLED", "False")',
		'document.createElement("input").setAttribute("checked", "CHECKED")',
		'document.createElement("button").setAttribute("disabled", "false ")',
		'document.createElement("section").setAttribute("inert", "false")',
		'document.createElement("selectedcontent").setAttribute("inert", "false")',
		'document.createElement("button").setAttribute("disabled", "false").toString()',
		'document.createElementNS("http://www.w3.org/1999/xhtml", "button").setAttribute("disabled", "false")',
		'document?.createElement?.("button")?.setAttribute?.("disabled", "false")',
		'document?.querySelector?.("button.primary")?.setAttribute?.("disabled", "false")',
		'window.document.createElement("button").setAttribute("disabled", "false")',
		'globalThis.document.createElement("button").setAttribute("disabled", "false")',
		'const documentAlias = document; const button = documentAlias.createElement("button"); const alias = button; alias.setAttribute("disabled", "false")',
		'const name = "disabled"; const value = "false"; document.createElement("button").setAttribute(name, value)',
		'const tag = "button"; document.createElement(tag).setAttribute("disabled", "false")',
		...['button', 'button.primary', 'button#submit.primary', ' button '].map(selector => `document.querySelector('${selector}').setAttribute('disabled', 'false')`),
		'const button = document.querySelector("button.primary"); button?.setAttribute("disabled", "false")',
		String.raw`document.querySelector("b\\75tton").setAttribute("disabled", "false")`,
		'document.createElement("button").setAttribute?.("disabled", "false")',
		'document.createElement("button")["setAttribute"]("disabled", "false")',
		'document.createElement("button")["set" + "Attribute"]("disabled", "false",)',
		'document.createElement("button")["set" /* method */ + "Attribute"]("disabled", "false")',
		'document.createElement("button")[/* method */ "setAttribute"]?.("disabled", "false")',
		'const method = "setAttribute"; document.createElement("button")[method]("disabled", "false")',
		'const result = document.createElement("button").setAttribute("disabled", "false")',
		'((document.createElement("button"))).setAttribute("disabled", (("false")),)',
		'document.createElement("button").setAttribute(/* name */ "disabled", "false")',
		'document.createElement("button").setAttribute("disabled", /* value */ "false")',
		'document.createElement("button").setAttribute("disabled", (/* inside */ false))',
		'document.createElement("button").setAttribute("disabled", /* value */ "true")',
		'document.createElement("button").setAttribute("disabled", (/* inside */ true))',
		'document.createElement("button").setAttribute("disabled", "false" /* trailing */)',
		'document.createElement("button").setAttribute("disabled", "false", /* trailing */)',
		'document.createElement("button").setAttribute("disabled", (true /* inside */))',
		'document.createElement("button").setAttribute("disabled", "tr" /* value */ + "ue")',
		'document.createElement("button")\r\n  .setAttribute(\r\n    "disabled",\r\n    "false",\r\n  )',
		...['HTMLButtonElement', 'HTMLButtonElement | null', 'HTMLButtonElement | undefined', 'HTMLButtonElement | HTMLInputElement'].map(type => typescript(`function foo(button: ${type}) {button?.setAttribute('disabled', 'false')}`)),
		...['button as HTMLButtonElement', '<HTMLButtonElement>button', 'button!', 'button satisfies HTMLButtonElement'].map(receiver => typescript(`function foo(button: HTMLButtonElement) {(${receiver}).setAttribute('disabled', 'false')}`)),
		typescript('type Button = HTMLButtonElement; function foo(button: Button) {button.setAttribute("disabled", "false")}'),
		typescript('declare const button: HTMLButtonElement; button.setAttribute("disabled", "false")'),
		typescript('type Empty = null; type Button = HTMLButtonElement | Empty; function foo(button: Button) {button?.setAttribute("disabled", "false")}'),
		typescript('type Empty = undefined; function foo(button: HTMLButtonElement | Empty) {button?.setAttribute("disabled", "false")}'),
		typescript('const button = document.createElement("button") satisfies HTMLButtonElement; button.setAttribute("disabled", "false")'),
		typescript('function foo(button: HTMLButtonElement) {button.setAttribute("disabled", false as const)}'),
		typeAware('const button = document.createElement("button"); button.setAttribute("disabled", "false")'),
		typeAware('document.querySelector<HTMLButtonElement>("button.primary")?.setAttribute("disabled", "false")'),
		typeAware('let button = document.createElement("button"); button.setAttribute("disabled", "false")'),
		typeAware('function foo(event: MouseEvent) {(event.currentTarget as HTMLButtonElement).setAttribute("disabled", "false")}'),
		typeAware('function foo(holder: {button: HTMLButtonElement | null}) {holder.button?.setAttribute("disabled", "false")}'),
		typeAware('function foo(holder: {button: HTMLButtonElement | HTMLInputElement | null}) {holder.button?.setAttribute("disabled", "false")}'),
		typeAware('function foo(holder: {button: HTMLButtonElement | HTMLDivElement}) {holder.button.setAttribute("inert", "false")}'),
		typeAware('export {}; declare global {interface HTMLButtonElement {extra: string}} function foo(holder: {button: HTMLButtonElement}) {holder.button.setAttribute("disabled", "false")}'),
	],
});

test('works alongside prefer-toggle-attribute', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: {
			'unicorn/no-invalid-boolean-attribute-value': 'error',
			'unicorn/prefer-toggle-attribute': 'error',
		},
	};
	const code = 'const button = document.createElement("button"); if (condition) {button.setAttribute("disabled", "false")} else {button.removeAttribute("disabled")}';
	const messages = linter.verify(code, config);
	t.deepEqual(messages.map(message => message.ruleId).toSorted((first, second) => first.localeCompare(second)), [
		'unicorn/no-invalid-boolean-attribute-value',
		'unicorn/prefer-toggle-attribute',
	]);
	t.false(linter.verifyAndFix(code, config).fixed);

	const suggestion = messages.find(message => message.ruleId === 'unicorn/no-invalid-boolean-attribute-value').suggestions[0];
	const corrected = code.slice(0, suggestion.fix.range[0]) + suggestion.fix.text + code.slice(suggestion.fix.range[1]);
	t.deepEqual(linter.verify(corrected, config), []);
});
