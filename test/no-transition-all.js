import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		{code: 'a { transition: opacity 150ms; }', language: languages.css},
		{code: 'a { transition: 150ms ease; }', language: languages.css},
		{code: 'a { transition-property: opacity, color; }', language: languages.css},
		{code: 'a { transition-property: none; }', language: languages.css},
		{code: 'a { transition: var(--transition); }', language: languages.css},
		{code: 'a { transition: var(--transition, all); }', language: languages.css},
		{code: 'a { --transition: all 150ms; }', language: languages.css},
		{code: 'a { -webkit-transition: all 150ms; }', language: languages.css},
		{code: 'a { animation: all 150ms; }', language: languages.css},
		{code: '@supports (transition: all 150ms) {}', language: languages.css},
		{code: '@supports (transition-property: all) {}', language: languages.css},
		{code: 'a { transition: \\61\u00A0ll 150ms; }', language: languages.css},
		{code: '@container style(transition: all 150ms) {}', language: languages.css},
		{code: '@import "x.css" supports(transition: all 150ms);', language: languages.css},
	],
	invalid: [
		{code: 'a { transition: all 150ms; }', language: languages.css},
		{code: 'a { transition-property: all; }', language: languages.css},
		{code: '@supports (display: grid) { a { transition: all; } }', language: languages.css},
		{code: 'a { transition: opacity 150ms, all 300ms; }', language: languages.css},
		{code: 'a { transition-property: opacity, all, color; }', language: languages.css},
		{code: 'a { transition: ALL 150ms; }', language: languages.css},
		{code: 'a { transition-property: all, all; }', language: languages.css},
	],
});

test({
	testerOptions: languages.css,
	valid: [],
	invalid: [
		{
			code: String.raw`a { transition: \61 ll 150ms; }`,
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			code: String.raw`a { tr\61 nsition: all 150ms; }`,
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			code: 'a { TRANSITION: all 150ms; }',
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			code: String.raw`a { transition: \61
ll 150ms; }`,
			errors: [{messageId: 'no-transition-all'}],
		},
	],
});

test({
	valid: [
		'element.style.transition = \'all\';',
		{
			code: '<div style={{transition: \'all\'}} />;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		typeAware('document.body.style.transition = \'opacity 150ms\';'),
		typeAware('document.body.style.transition = \'all !important\';'),
		typeAware('document.body.style.transition = transitionValue;'),
		typeAware('document.body.style.transition += \'all\';'),
		typeAware('document.body.style[\'transition\'] = \'all\';'),
		typeAware('document.body.style.setProperty(\'animation\', \'all\');'),
		typeAware('document.body.style.setProperty(\'transition\', transitionValue);'),
		typeAware('document.body.style.setProperty(\'transition\', \'all\', \'invalid\');'),
		typeAware('document.body.style.setProperty(\'transition\', \'all\', `invalid`);'),
		typeAware('document.body.style.setProperty(\'transition\', \'all\', false);'),
		typeAware('document.body.style.setProperty(\'transition\', \'all\', 0);'),
		typeAware('document.body.style.setProperty(\'transition\', \'all !important\');'),
		typeAware('declare const properties: [string]; document.body.style.setProperty(...properties, \'all\');'),
		typeAware('declare const values: [string]; document.body.style.setProperty(\'transition\', ...values);'),
		typeAware('document.body.style.setProperty(\'transition\', \'all\', ...priorities);'),
		typeAware('const style = {transition: \'\'}; style.transition = \'all\';'),
		typeAware('declare const style: CSSStyleDeclaration | {transition: string}; style.transition = \'all\';'),
	],
	invalid: [
		{
			...typeAware('document.body.style.transition = \'all\';'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.transition = \'all 150ms\';'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.transitionProperty = \'opacity, all\';'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('const style: CSSStyleDeclaration = document.body.style; style.transition = \'ALL\';'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('const style: CSSStyleProperties = getComputedStyle(document.body); style.transition = \'all\';'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('declare const style: CSSStyleDeclaration | CSSStyleProperties; style.transition = \'all\';'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.transition = \'all\' as string;'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.transition = `all 150ms`;'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'transition-property\', \'all\');'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'TRANSITION\', \'all 150ms\');'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'transition\', \'all\', \'\');'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'transition\', \'all\', \'IMPORTANT\');'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'transition\', \'all\', `IMPORTANT`);'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'transition\', \'all\', null);'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'transition\', \'all\', undefined);'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'transition\', \'all\', priority);'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty(\'transition\', \'all\', \'important\', \'ignored\');'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style.setProperty?.(\'transition\', \'all\');'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('document.body.style?.setProperty(\'transition\', \'all\');'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware('declare const style: CSSStyleDeclaration | undefined; style?.setProperty(\'transition\', \'all\');'),
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			...typeAware(String.raw`document.body.style.transition = '\\61 ll 150ms';`),
			errors: [{messageId: 'no-transition-all'}],
		},
	],
});
