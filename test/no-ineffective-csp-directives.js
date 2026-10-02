/* eslint-disable no-template-curly-in-string */
import {getTester, languages, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const htmlOptions = {
	language: languages.html.language,
	plugins: languages.html.plugins,
};
const jsxOptions = {
	languageOptions: {
		parserOptions: {
			ecmaFeatures: {jsx: true},
		},
	},
};

const html = tests => test.snapshot({
	...tests,
	valid: tests.valid.map(code => ({code, language: languages.html})),
	invalid: tests.invalid.map(code => ({code, language: languages.html})),
});

const message = directive => `The CSP directive \`${directive}\` is ignored in \`<meta>\` elements. Deliver it through the \`Content-Security-Policy\` HTTP response header instead.`;

test({
	testerOptions: htmlOptions,
	valid: [],
	invalid: [
		{
			code: '<meta http-equiv="Content-Security-Policy" content="frame-ancestors \'none\'; sandbox">',
			errors: ['frame-ancestors', 'sandbox'].map(directive => ({
				message: message(directive),
				line: 1,
				column: 53,
				endLine: 1,
				endColumn: 84,
			})),
		},
	],
});

html({
	valid: [
		'<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'none\'; report-to endpoint">',
		'<meta http-equiv="Content-Security-Policy-Report-Only" content="sandbox">',
		'<meta http-equiv=" Content-Security-Policy" content="sandbox">',
		'<meta http-equiv="Content-Security-Policy " content="sandbox">',
		'<meta name="Content-Security-Policy" content="sandbox">',
		'<div http-equiv="Content-Security-Policy" content="sandbox"></div>',
		'<meta http-equiv="Content-Security-Policy">',
		'<meta http-equiv="Content-Security-Policy" content>',
		'<meta http-equiv="Content-Security-Policy" content="">',
		'<meta http-equiv="Content-Security-Policy" content="script-src https://example.com/sandbox; default-src frame-ancestors report-uri">',
		'<meta http-equiv="Content-Security-Policy" content="sandboxed; report-uri-extra; frame-ancestors-extra">',
		'<meta http-equiv="Content-Security-Policy" content="script-src \'self\' sandbox">',
		'<meta http-equiv="Content-Security-Policy" content="script-src \'self\', sandbox">',
		'<meta http-equiv="Content-Security-Policy" content="sandbox,frame-ancestors">',
		'<meta http-equiv="Content-Security-Policy" content="sandbox/">',
		'<meta http-equiv=Content-Security-Policy content=sandbox/>',
		'<meta http-equiv="Content-Security-Policy" content="sandbox\u00A0allow-scripts">',
		'<meta http-equiv="Content-Security-Policy" content="\u000Bsandbox">',
		'<meta http-equiv="Content-Security-Policy" content="sandbox\u000Ballow-scripts">',
		'<textarea><meta http-equiv="Content-Security-Policy" content="sandbox"></textarea>',
		'<title><meta http-equiv="Content-Security-Policy" content="sandbox"></title>',
		'<script>const html = \'<meta http-equiv="Content-Security-Policy" content="sandbox">\';</script>',
		'<!-- <meta http-equiv="Content-Security-Policy" content="sandbox"> -->',
		'<meta http-equiv="Content-Security-Policy" content="sandbox"',
		'<meta http-equiv="refresh" http-equiv="Content-Security-Policy" content="sandbox">',
		'<meta http-equiv="Content-Security-Policy" content="default-src" content="sandbox">',
		'<meta data-url=https://example.com title=\'<meta http-equiv="Content-Security-Policy" content="sandbox">\'>',
		'<meta http-equiv http-equiv="Content-Security-Policy" content="sandbox">',
		'<meta http-equiv="Content-Security-Policy" content content="sandbox">',
		'<meta name="description" content="sandbox"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'">',
	],
	invalid: [
		'<meta http-equiv="Content-Security-Policy" content="frame-ancestors \'none\'">',
		'<meta http-equiv="Content-Security-Policy" content="sandbox">',
		'<meta http-equiv="Content-Security-Policy" content="sandbox allow-scripts">',
		'<meta http-equiv="Content-Security-Policy" content="report-uri /csp">',
		'<meta http-equiv="Content-Security-Policy" content="frame-ancestors \'none\'; sandbox; report-uri /csp">',
		'<meta http-equiv="Content-Security-Policy" content="sandbox; SANDBOX allow-scripts; report-uri /csp; REPORT-URI /other">',
		'<META HTTP-EQUIV="content-SECURITY-policy" CONTENT="FRAME-ANCESTORS \'none\'; SaNdBoX; REPORT-URI /csp">',
		'<meta content="; ; sandbox; ;" http-equiv="Content-Security-Policy">',
		'<meta content="frame&#45;ancestors &#39;none&#39;&#59; sandbox" http-equiv="Content&#45;Security&#45;Policy">',
		'<meta http-equiv=Content-Security-Policy content=sandbox>',
		'<meta http-equiv=Content-Security-Policy content=script-src&#32;https://example.com;sandbox>',
		'<meta data-url=https://example.com http-equiv=Content-Security-Policy content=sandbox>',
		'<meta content=report-uri&#32;/csp;sandbox http-equiv=Content-Security-Policy>',
		...['\t', '\n', '\f', '\r', ' '].map(whitespace => `<meta http-equiv="Content-Security-Policy" content="${whitespace}sandbox${whitespace}allow-scripts${whitespace}">`),
		'<head>\r\n  <meta http-equiv="Content-Security-Policy" content="sandbox;\r\n    frame-ancestors \'none\'">\r\n</head>',
		'<meta data-url=https://example.com title="a > b" http-equiv="Content-Security-Policy" content="sandbox">',
		'<meta http-equiv=Content-Security-Policy data-url=https://example.com content="default-src >; sandbox">',
		'<meta http-equiv="Content-Security-Policy" content="sandbox; SANDBOX">\n<meta http-equiv="Content-Security-Policy" content="sandbox">',
	],
});

html({
	testerOptions: {
		languageOptions: {
			templateEngineSyntax: {'{{': '}}'},
		},
	},
	valid: [
		'<meta http-equiv="Content-Security-Policy" content="sandbox; {{policy}}">',
		'<meta http-equiv="{{header}}" content="sandbox">',
		'<meta {{attribute}}="Content-Security-Policy" content="sandbox">',
		'<meta http-equiv="Content-Security-Policy" con{{attribute}}tent="sandbox">',
		'<meta http-equiv="Content-Security-Policy" {{content="sandbox"}}>',
		'<meta http-equiv="Content-Security-Policy" title="{{value}}" content="sandbox">',
		'<meta data-url=https://example.com http-equiv="Content-Security-Policy" content="sandbox; {{policy}}">',
	],
	invalid: [
		'<meta http-equiv="Content-Security-Policy" content="sandbox">',
	],
});

test.snapshot({
	testerOptions: jsxOptions,
	valid: [
		'<meta httpEquiv="Content-Security-Policy" content="default-src \'self\'; report-to endpoint" />',
		'<meta httpEquiv="Content-Security-Policy-Report-Only" content="sandbox" />',
		'<meta httpEquiv=" Content-Security-Policy " content="sandbox" />',
		'<Meta httpEquiv="Content-Security-Policy" content="sandbox" />',
		'<UI.meta httpEquiv="Content-Security-Policy" content="sandbox" />',
		'<meta HTTPEQUIV="Content-Security-Policy" content="sandbox" />',
		'<meta httpEquiv="Content-Security-Policy" Content="sandbox" />',
		'<meta httpEquiv="Content-Security-Policy" />',
		'<meta httpEquiv="Content-Security-Policy" content />',
		'<meta httpEquiv="Content-Security-Policy" content={42} />',
		'<meta httpEquiv={header} content="sandbox" />',
		'<meta httpEquiv="Content-Security-Policy" content={policy} />',
		'<meta httpEquiv="Content-Security-Policy" content={getPolicy()} />',
		'<meta httpEquiv="Content-Security-Policy" content={`${policy}; sandbox`} />',
		'<meta httpEquiv="Content-Security-Policy" content={undefined} />',
		'<meta httpEquiv="Content-Security-Policy" content={"frame&#45;ancestors \'none\'"} />',
		'<meta httpEquiv={"Content&#45;Security&#45;Policy"} content="sandbox" />',
		'let policy = "sandbox"; policy = "default-src"; <meta httpEquiv="Content-Security-Policy" content={policy} />',
		'let directive = "sandbox"; const policy = directive; <meta httpEquiv="Content-Security-Policy" content={policy} />',
		'<meta httpEquiv="Content-Security-Policy" content={policy} />; const policy = "sandbox";',
		'const policy = {value: "sandbox"}; policy.value = "default-src"; <meta httpEquiv="Content-Security-Policy" content={policy.value} />',
		'<meta {...properties} httpEquiv="Content-Security-Policy" content="sandbox" />',
		'<meta httpEquiv="Content-Security-Policy" content="sandbox" {...properties} />',
		'<meta httpEquiv="Content-Security-Policy" content="sandbox" content="default-src" />',
		'<meta httpEquiv="Content-Security-Policy" http-equiv="refresh" content="sandbox" />',
		'<meta httpEquiv="Content-Security-Policy" httpEquiv="refresh" content="sandbox" />',
	],
	invalid: [
		'<meta httpEquiv="Content-Security-Policy" content="frame-ancestors \'none\'; sandbox; report-uri /csp" />',
		'<meta http-equiv="Content-Security-Policy" content="sandbox" />',
		'<meta content="sandbox" httpEquiv="content-security-policy" />',
		'<meta httpEquiv={"Content-Security-Policy"} content={"sandbox"} />',
		'<meta httpEquiv="Content-Security-Policy" content={`sandbox`} />',
		'const header = "Content-Security-Policy"; const policy = "sandbox"; <meta httpEquiv={header} content={policy} />',
		'const directive = "frame-ancestors"; <meta httpEquiv="Content-Security-Policy" content={`${directive} \'none\'; sandbox`} />',
		'<meta httpEquiv="Content-Security-Policy" content={"sandbox; " + "report-uri /csp"} />',
		'<meta httpEquiv="Content-Security-Policy" content="frame&#45;ancestors &#39;none&#39;&#59; sandbox" />',
		'<><meta httpEquiv="Content-Security-Policy" content={/* policy */ "sandbox"} /></>',
		{
			code: 'const policy = "sandbox" as const; <meta httpEquiv="Content-Security-Policy" content={policy satisfies string} />',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<meta httpEquiv={("Content-Security-Policy" as string)!} content={("sandbox" as string)!} />',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

test({
	testerOptions: jsxOptions,
	valid: [],
	invalid: [
		{
			code: '<meta httpEquiv="Content-Security-Policy" content="sandbox; SANDBOX; report-uri /csp; frame-ancestors \'none\'" />',
			errors: ['sandbox', 'report-uri', 'frame-ancestors'].map(directive => ({
				message: message(directive),
			})),
		},
	],
});
