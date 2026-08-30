import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		{
			code: outdent`
				:hover, :focus-visible, :is(.foo, :not(.bar)), ::before, :before, :after, :first-line, :first-letter {}
				::view-transition-group(example), ::highlight(example), :active-view-transition-type(example), :heading(1) {}
			`,
			language: languages.css,
		},
		{code: ':hover(), :is, ::before() {}', language: languages.css},
		{code: ':HOVER, ::BEFORE {}', language: languages.css},
		{code: String.raw`:h\6f ver, ::b\65 fore {}`, language: languages.css},
		{code: '@page :first {}', language: languages.css},
		{code: '@page :recto, :verso {}', language: languages.css},
		{code: '::first-letter::prefix, ::first-letter::suffix {}', language: languages.css},
		{
			code: ':global, :GLOBAL(.foo), :deep(.bar), ::theme-part {}',
			language: languages.css,
			options: [{allow: [':global', ':deep', '::theme-part']}],
		},
		{
			code: ':-webkit-autofill, ::-webkit-slider-thumb {}',
			language: languages.css,
			options: [{allow: [':-webkit-autofill', '::-webkit-slider-thumb']}],
		},
		{
			code: String.raw`:\3A theme {}`,
			language: languages.css,
			options: [{allow: [String.raw`:\3A theme`]}],
		},
		{
			code: String.raw`:\:theme, :foo\( {}`,
			language: languages.css,
			options: [{allow: [String.raw`:\:theme`, String.raw`:foo\(`]}],
		},
		{
			code: ':foo {}',
			language: languages.css,
			options: [{allow: [String.raw`:\66 oo`]}],
		},
	],
	invalid: [
		{code: ':foucs {}', language: languages.css},
		{code: ':hovr::befor {}', language: languages.css},
		{code: ':is(.foo:foucs, :not(.bar:hovr)) {}', language: languages.css},
		{code: ':has(> .foo:foucs), ::slotted(.bar:hovr) {}', language: languages.css},
		{code: '@supports selector(:foucs) {} @scope (:hovr) {}', language: languages.css},
		{code: '::hover {}', language: languages.css},
		{code: ':backdrop {}', language: languages.css},
		{code: ':-webkit-autofill {}', language: languages.css},
		{code: '::-webkit-slider-thumb {}', language: languages.css},
		{code: ':global(.foo) {}', language: languages.css},
		{code: '::theme-part {}', language: languages.css},
		{code: String.raw`:\3A backdrop {}`, language: languages.css},
		{code: ':linK {}', language: languages.css},
		{
			code: '::foo {}',
			language: languages.css,
			options: [{allow: [':foo']}],
		},
	],
});
