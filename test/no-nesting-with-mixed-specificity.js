import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const withCssLanguage = testCases => testCases.map(code => ({code, language: languages.css}));

test.snapshot({
	valid: withCssLanguage([
		'#dialog, .dialog {}',
		'#dialog, .dialog { @media (width > 40rem) { color: red; } }',
		'#dialog { & .close {} }',
		'#dialog, #modal { & .close {} }',
		'.dialog, [open] { & .close {} }',
		'dialog, ::before { & .close {} }',
		'#dialog::before, .dialog { & .close {} }',
		'#dialog::before, .dialog { .close {} }',
		'::before { .dialog, #dialog { .close {} } }',
		'.root { &::before { .dialog, #dialog { .close {} } } }',
		'.root { &::before { @media (width > 40rem) { .dialog, #dialog { .close {} } } } }',
		'.dialog, :hover { & .close {} }',
		'*, :where(#dialog) { & .close {} }',
		':is(.dialog, #dialog), #modal { & .close {} }',
		String.raw`:\62 efore, dialog { & .close {} }`,
		':before, .dialog { & .close {} }',
		':not(.dialog, #dialog), #modal { & .close {} }',
		':has(.dialog, #dialog), #modal { & .close {} }',
		':nth-child(2n of #dialog), #modal:hover { & .close {} }',
		':nth-last-child(2n of #dialog), #modal:hover { & .close {} }',
		':host(#dialog), #modal:hover { & .close {} }',
		':host-context(#dialog), #modal:hover { & .close {} }',
		'::slotted(#dialog), #modal { & .close {} }',
		'ns|*, |* { & .close {} }',
		'@scope (#dialog) { #dialog { .close {} } }',
		'.root { :is(&), & { .child {} } }',
		'.root { :has(> &), & { .child {} } }',
		'.root { :is(:unknown(&), .bar), & { .child {} } }',
		String.raw`.root { :is(:unknown("&"), :unknown(\26), :unknown(foo /* & */), .bar), &:hover { .child {} } }`,
		'.root { .theme &, &.theme { .child {} } }',
		'.root { :nth-child(2n of &), &:hover { .child {} } }',
		'.root { > &, && { .child {} } }',
		outdent`
			.dialog, .modal {
				&, & {
					.close {}
				}
			}
		`,
	]),
	invalid: withCssLanguage([
		'#dialog, .dialog { & .close {} }',
		'#dialog, .dialog { .close {} }',
		'#dialog, .dialog { &::before {} }',
		'#dialog, .dialog { ::before {} }',
		'button, .button { & .icon {} }',
		'[open], dialog { & .close {} }',
		':hover, dialog { & .close {} }',
		':where(#dialog), :is(.dialog, #dialog) { & .close {} }',
		':nth-child(2n of #dialog), #modal { & .close {} }',
		':host(#dialog), #modal { & .close {} }',
		'&, :hover { .close {} }',
		'*|dialog, |* { & .close {} }',
		'@scope (.root) { #dialog, .dialog { .close {} } }',
		'#dialog, .dialog { @MEDIA (width > 40rem) { & .close {} } }',
		'.root { :where(&), & { .child {} } }',
		'.root { :is(:unknown(&), .bar), &:hover { .child {} } }',
		'.root { > &, & { .child {} } }',
		'#root, .root { .child { .grandchild {} } }',
		outdent`
			#dialog,
			.dialog {
				& .close {}
				& .submit {}
			}
		`,
		outdent`
			#dialog,
			.dialog {
				@media (width > 40rem) {
					@layer components {
						& .close {}
					}
				}
			}
		`,
		'.root { #dialog, .dialog { .close {} } }',
		'.root { &&, & { .close {} } }',
		'#dialog::before, .dialog { #inner, .inner { .grandchild {} } }',
	]),
});
