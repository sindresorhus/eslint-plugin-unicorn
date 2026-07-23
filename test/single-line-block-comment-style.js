import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			/**
			Get the value.
			*/
		`,
		outdent`
			/*
			Get the value.
			*/
		`,
		outdent`
			/**
			First line.
			Second line.
			*/
		`,
		'const value = /* Get the value. */ 1;',
		'/* eslint-disable rule-to-test/single-line-block-comment-style */',
		'/* global value */',
		'/* prettier-ignore */',
		'/* @ts-ignore */',
		'/* c8 ignore next */',
		'/* v8 ignore next */',
		'/* biome-ignore lint/suspicious/noExplicitAny */',
		'/**/',
		'/* */',
		'/**\n *\n */',
		'/*\n*\nValue.\n*/',
		'/** @jsxFrag Fragment */',
		'\u2028/**\u2028Value.\u2028*/\u2028',
		'// Get the value.',
		{
			code: '/** Another value. */',
			options: ['single-line'],
		},
		{
			code: '/* Another value. */',
			options: ['single-line'],
		},
		{
			code: '/**\r\nGet the value.\r\n*/',
		},
	],
	invalid: [
		'/** Get the value. */',
		'/* Get the value. */',
		'\t/** Get the value. */',
		'/** Carriage return value. */\r\nconst value = 1;',
		'/** Value.\n*/',
		'/* Value.\n*/',
		'\u2028/** Value. */\u2028const value = 1;',
		{
			code: outdent`
				/**
				Another value.
				*/
			`,
			options: ['single-line'],
		},
		{
			code: outdent`
				/*
				Another value.
				*/
			`,
			options: ['single-line'],
		},
		{
			code: '/**\r\nCarriage return value.\r\n*/',
			options: ['single-line'],
		},
		{
			code: '\t/**\r\nCarriage return value.\r\n\t*/',
			options: ['single-line'],
		},
		{
			code: '/**\nValue. */',
			options: ['single-line'],
		},
		{
			code: '/*\nValue. */',
			options: ['single-line'],
		},
	],
});
