import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import arrayToSentence from 'array-to-sentence';
import rule from '../rules/jsx-import';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		ecmaFeatures: {
			jsx: true
		},
		sourceType: 'module'
	}
});

const pragmas = {
	h: ['dom-chef', 'preact'],
	React: ['react'],
	preact: ['preact']
};

const suggestedModules = name => arrayToSentence(pragmas[name].map(x => `\`${x}\``), {lastSeparator: ' or '});

const missingError = {
	ruleId: 'jsx-import',
	message: 'A valid pragma must be in scope when using JSX'
};

const superflousError = name => ({
	ruleId: 'jsx-import',
	message: `\`${name}\` shouldn't be imported when not using JSX`
});

const wrongError = name => ({
	ruleId: 'jsx-import',
	message: `\`${name}\` should be imported from ${suggestedModules(name)}`
});

ruleTester.run('jsx-import', rule, {
	valid: [
		`import React from 'react'; let Foo; <Foo/>;`,
		`import preact from 'preact'; let Foo; <Foo/>;`,
		`import preact, {render} from 'preact'; let Foo; <Foo/>;`,
		`import {h, render} from 'preact'; let Foo; <Foo/>;`,
		`import {h} from 'dom-chef'; let Foo; <Foo/>;`,
		`const React = require('react'); let Foo; <Foo/>;`,
		`const preact = require('preact'); let Foo; <Foo/>;`,
		`const {h} = require('preact'); let Foo; <Foo/>;`,
		`const {h} = require('dom-chef'); let Foo; <Foo/>;`
	],
	invalid: [
		{
			code: `import bar from 'bar'; let Foo; <Foo/>;`,
			errors: [missingError]
		},
		{
			code: `const bar = require('bar'); let Foo; <Foo/>;`,
			errors: [missingError]
		},
		{
			code: `import React from 'react'; let Foo;`,
			errors: [superflousError('React')]
		},
		{
			code: `import preact from 'preact'; let Foo;`,
			errors: [superflousError('preact')]
		},
		{
			code: `import {h} from 'preact'; let Foo;`,
			errors: [superflousError('h')]
		},
		{
			code: `const React = require('react'); let Foo;`,
			errors: [superflousError('React')]
		},
		{
			code: `const preact = require('preact'); let Foo;`,
			errors: [superflousError('preact')]
		},
		{
			code: `const {h} = require('preact'); let Foo;`,
			errors: [superflousError('h')]
		},
		{
			code: `import React from 'foobar'; let Foo; <Foo/>`,
			errors: [wrongError('React')],
			output: `import React from 'react'; let Foo; <Foo/>`
		},
		{
			code: `import preact from 'foobar'; let Foo; <Foo/>`,
			errors: [wrongError('preact')],
			output: `import preact from 'preact'; let Foo; <Foo/>`
		},
		{
			code: `import {h} from 'foobar'; let Foo; <Foo/>`,
			errors: [wrongError('h')]
		},
		{
			code: `const React = require('foobar'); let Foo; <Foo/>`,
			errors: [wrongError('React')],
			output: `const React = require('react'); let Foo; <Foo/>`
		},
		{
			code: `const preact = require('foobar'); let Foo; <Foo/>`,
			errors: [wrongError('preact')],
			output: `const preact = require('preact'); let Foo; <Foo/>`
		},
		{
			code: `const {h} = require('foobar'); let Foo; <Foo/>`,
			errors: [wrongError('h')]
		}
	]
});
