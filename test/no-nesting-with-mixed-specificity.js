import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const withCssLanguage = testCases => testCases.map(code => ({code, language: languages.css}));

test.snapshot({
	valid: withCssLanguage([
		'#dialog, .dialog {}',
		'#dialog { & .close {} }',
		'#dialog, #modal { & .close {} }',
		'.dialog, [open] { & .close {} }',
		'dialog, ::before { & .close {} }',
		'.dialog, :hover { & .close {} }',
		'*, :where(#dialog) { & .close {} }',
		':is(.dialog, #dialog), #modal { & .close {} }',
		':not(.dialog, #dialog), #modal { & .close {} }',
		':has(.dialog, #dialog), #modal { & .close {} }',
		':nth-child(2n of #dialog), #modal:hover { & .close {} }',
		':nth-last-child(2n of #dialog), #modal:hover { & .close {} }',
		':host(#dialog), #modal:hover { & .close {} }',
		':host-context(#dialog), #modal:hover { & .close {} }',
		'::slotted(#dialog), #modal::before { & .close {} }',
		'ns|*, |* { & .close {} }',
		'@scope (#dialog) { #dialog { .close {} } }',
		'.root { :is(&), & { .child {} } }',
		'.root { :has(> &), & { .child {} } }',
		'.root { :nth-child(2n of &), &:hover { .child {} } }',
		'.root { ::slotted(&), &::before { .child {} } }',
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
		'button, .button { & .icon {} }',
		'[open], dialog { & .close {} }',
		':hover, dialog { & .close {} }',
		':before, .dialog { & .close {} }',
		':where(#dialog), :is(.dialog, #dialog) { & .close {} }',
		':nth-child(2n of #dialog), #modal { & .close {} }',
		':host(#dialog), #modal { & .close {} }',
		'::slotted(#dialog), #modal { & .close {} }',
		'*|dialog, |* { & .close {} }',
		'@scope (.root) { #dialog, .dialog { .close {} } }',
		'.root { :where(&), & { .child {} } }',
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
					& .close {}
				}

				@layer components {
					& .title {}
				}
			}
		`,
		'.root { #dialog, .dialog { .close {} } }',
		'.root { &&, & { .close {} } }',
	]),
});
