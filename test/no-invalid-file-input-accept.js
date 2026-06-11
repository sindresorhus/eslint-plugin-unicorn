/* eslint-disable no-template-curly-in-string */
import htmlEslintPlugin from '@html-eslint/eslint-plugin';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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

const jsx = tests => test(withJsx(tests));
jsx.snapshot = tests => test.snapshot(withJsx(tests));

const withHtml = tests => ({
	...tests,
	testerOptions: {
		...tests.testerOptions,
		languageOptions: {
			...tests.testerOptions?.languageOptions,
			parser: parsers.html,
		},
	},
});

const html = tests => test(withHtml(tests));
html.snapshot = tests => test.snapshot(withHtml(tests));

const withHtmlTemplates = tests => ({
	...tests,
	testerOptions: {
		...tests.testerOptions,
		languageOptions: {
			...tests.testerOptions?.languageOptions,
			parser: parsers.html,
			parserOptions: {
				...tests.testerOptions?.languageOptions?.parserOptions,
				templateEngineSyntax: {
					'{{': '}}',
				},
			},
		},
	},
});

const htmlTemplates = tests => test(withHtmlTemplates(tests));
htmlTemplates.snapshot = tests => test.snapshot(withHtmlTemplates(tests));

const htmlPlugin = tests => test({
	...tests,
	testerOptions: {
		...tests.testerOptions,
		language: 'html/html',
		plugins: {
			html: htmlEslintPlugin,
		},
	},
});

jsx.snapshot({
	valid: [
		'<input type="file" accept="image/png" />',
		'<input type="file" accept=".png" />',
		'<input type="file" accept="image/png, .png" />',
		'<input type="file" accept=".tar.gz" />',
		'<input type="file" accept="audio/*" />',
		'<input type="file" accept="video/*" />',
		'<input type="file" accept="image/*" />',
		'<input type="FILE" accept="image/png" />',
		'<input type={"file"} accept="image/png" />',
		'const type = "file"; <input type={type} accept="image/png" />',
		'const accept = "image/png"; <input type="file" accept={accept} />',
		'<input accept="image/png" />',
		'<input type="text" accept="image/png" />',
		'<input type={type} accept="image/png" />',
		'<Input type="file" accept="image/jpg" />',
		'<input type="file" Accept="image/jpg" />',
		'<input Type="file" accept="image/jpg" />',
	],
	invalid: [
		'<input type="file" accept />',
		'<input type="file" accept={allowedTypes} />',
		'<input type="file" accept={`image/${type}`} />',
		'<input type="file" accept="image/jpg" />',
		'<input type="file" accept="image/svg" />',
		'<input type="file" accept="png" />',
		'<input type="file" accept="IMAGE/*" />',
		'<input type="file" accept="TEXT/*" />',
		'<input type="file" accept="*/plain" />',
		'<input type="file" accept="not-real-mime-type/*" />',
		'<input type="file" accept="image/png," />',
		'<input type="file" accept="image/png,, .png" />',
		'<input type="file" accept="IMAGE/PNG,.PNG, image/png" />',
		'<input type="file" accept="image/png,.png" />',
		'<input type="file" accept="image/png; charset=utf-8" />',
		'<input type="file" accept={"IMAGE/PNG"} />',
	],
});

html.snapshot({
	valid: [
		'<input type="file" accept="image/png">',
		'<input type="file" accept=".png">',
		'<input type="file" accept="image/png, .png">',
		'<input type="file" accept=".tar.gz">',
		'<input type="file" accept="audio/*">',
		'<input type="file" accept="video/*">',
		'<input type="file" accept="image/*">',
		'<input type="FILE" accept="image/png">',
		'<input accept="image/png">',
		'<input type="text" accept="image/png">',
		// `@html-eslint/parser` splits unquoted MIME values at `/`; these cover reconstruction for checking.
		'<input type=file accept=image/png>',
		'<input type=file accept=image/png >',
		'<input type=file accept=image/png />',
		'<input type=file accept=image/png disabled>',
		'<input type=file accept=image/*>',
		'<input accept=image/png type=file>',
		'<input accept=image/png disabled type=file>',
		'<input accept=image/jpg title="file type=file disabled">',
		'<input type=file data-url=https://example.com accept=image/png>',
		'<input data-url=/upload type=file accept=image/png>',
		// Character references are ignored because this rule does not decode HTML entities.
		'<input type=file accept="image&#x2F;png">',
		'<input type=file accept=image&#x2F;png>',
		'<input type=file accept="image&#47;jpg">',
		'<input type=file accept="image/png&#44;.png">',
	],
	invalid: [
		'<input type="file" accept>',
		'<input type="file" accept="${allowedTypes}">',
		'<input type="file" accept="image/jpg">',
		'<input type="file" accept="image/svg">',
		'<input type="file" accept="png">',
		'<input type="file" accept="IMAGE/*">',
		'<input type="file" accept="TEXT/*">',
		'<input type="file" accept="*/plain">',
		'<input type="file" accept="not-real-mime-type/*">',
		'<input type="file" accept="image/png,">',
		'<input type="file" accept="IMAGE/PNG,.PNG, image/png">',
		'<input type="file" accept="image/png,.png">',
		'<input type="file" accept="image/png; charset=utf-8">',
	],
});

htmlTemplates.snapshot({
	valid: [
		'<input type="file" accept="video/mp4">',
	],
	invalid: [
		'<input type="file" accept="{{allowedTypes}}">',
	],
});

htmlPlugin({
	valid: [
		'<input type="file" accept="application/pdf">',
	],
	invalid: [
		{
			code: '<input type="file" accept="IMAGE/JPEG">',
			output: '<input type="file" accept="image/jpeg">',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
	],
});

jsx({
	valid: [],
	invalid: [
		{
			code: '<input type="file" accept="image/x-icon" />',
			output: '<input type="file" accept="image/vnd.microsoft.icon" />',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="application/x-rar-compressed" />',
			output: '<input type="file" accept="application/vnd.rar" />',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="application/x-zip-compressed" />',
			output: '<input type="file" accept="application/zip" />',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="image/x-icon, image/vnd.microsoft.icon, application/x-zip-compressed" />',
			output: '<input type="file" accept="image/vnd.microsoft.icon, application/zip" />',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="image/jpg; charset=utf-8" />',
			output: '<input type="file" accept="image/jpeg" />',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="image/svg; charset=utf-8" />',
			output: '<input type="file" accept="image/svg+xml" />',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
	],
});

html({
	valid: [],
	invalid: [
		{
			code: '<input type="file" accept="image/x-icon">',
			output: '<input type="file" accept="image/vnd.microsoft.icon">',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="application/x-rar-compressed">',
			output: '<input type="file" accept="application/vnd.rar">',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="application/x-zip-compressed">',
			output: '<input type="file" accept="application/zip">',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="image/jpg; charset=utf-8">',
			output: '<input type="file" accept="image/jpeg">',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type="file" accept="image/svg; charset=utf-8">',
			output: '<input type="file" accept="image/svg+xml">',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type = "file" accept="png">',
			output: '<input type = "file" accept=".png">',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=png>',
			output: '<input type=file accept=.png>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=png />',
			output: '<input type=file accept=.png />',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=png disabled>',
			output: '<input type=file accept=.png disabled>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input disabled accept=png type=file>',
			output: '<input disabled accept=.png type=file>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=.PNG />',
			output: '<input type=file accept=.png />',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=png/>',
			errors: [{messageId: 'no-invalid-file-input-accept/invalid'}],
		},
		{
			code: '<input type=file accept=.png/>',
			errors: [{messageId: 'no-invalid-file-input-accept/invalid'}],
		},
		{
			code: '<input type=file accept=image/png/>',
			errors: [{messageId: 'no-invalid-file-input-accept/invalid'}],
		},
		{
			code: '<input type=file accept=image/*/>',
			errors: [{messageId: 'no-invalid-file-input-accept/invalid'}],
		},
		{
			code: '<input type=file accept=png,jpeg>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept = "png,jpeg">',
			output: '<input type=file accept = ".png, .jpeg">',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=IMAGE/PNG>',
			output: '<input type=file accept=image/png>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=image/jpg>',
			output: '<input type=file accept=image/jpeg>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=IMAGE/*>',
			output: '<input type=file accept=image/*>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file accept=image/png,>',
			errors: [{messageId: 'no-invalid-file-input-accept/invalid'}],
		},
		{
			code: '<input accept=image/jpg type=file>',
			output: '<input accept=image/jpeg type=file>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input accept=IMAGE/PNG type=file>',
			output: '<input accept=image/png type=file>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input type=file data-url=https://example.com accept=png>',
			output: '<input type=file data-url=https://example.com accept=.png>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
		{
			code: '<input data-url=/upload type=file accept=image/jpg>',
			output: '<input data-url=/upload type=file accept=image/jpeg>',
			errors: [{messageId: 'no-invalid-file-input-accept/normalize'}],
		},
	],
});
