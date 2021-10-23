import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const x = 0;',
		';; const x = 0;',
		'{{{;;const x = 0;}}}',
		outdent`
			'use strict';
			const x = 0;
		`,
		';;\'use strict\';',
		'{\'use strict\';}',
		'("use strict")',
		'`use strict`',
		'({})',
		outdent`
			#!/usr/bin/env node
			console.log('done');
		`,
		'false',
		'("")',
		'NaN',
		'undefined',
		'null',
		'[]',
		'(() => {})()',
	],
	invalid: [
		'',
		'\uFEFF',
		' ',
		'\t',
		'\n',
		'\r',
		'\r\n',
		outdent`


		`,
		'// comment',
		'/* comment */',
		'#!/usr/bin/env node',
		'\'use asm\';',
		'\'use strict\';',
		'"use strict"',
		'""',
		';',
		';;',
		'{}',
		'{;;}',
		'{{}}',
	],
});

test.snapshot({
	testerOptions: {
		parser: parsers.vue,
	},
	valid: [
		outdent`
			<script>
			export default {
				render () {
					return (
						<p>Script</p>
					)
				}
			}
			</script>
		`,
		outdent`
			<script setup>
				console.log('🦄');
			</script>
			<template></template>
		`,
		'<script src="./imports/script.js"></script>',
		outdent`
			<style src="./imports/style.css"></style>
			<template></template>
		`,
		outdent`
			<style module src="./imports/style.module.css"></style>
			<template></template>
		`,
		'<template src="./imports/template.html"></template>',
		outdent`
			<style>
			html {
				background-color: purple;
			}
			</style>
			<template></template>
		`,
		outdent`
			<style module>
			p {
				background-color: purple;
			}
			</style>
			<template></template>
		`,
		outdent`
			<template>
				<p>Template</p>
			</template>
		`,
	],
	invalid: [
		'',
		'	',
		outdent`
			<style scoped src="./imports/style.scoped.css"></style>
			<template></template>
		`,
		outdent`
			<style scoped>
			html {
				background-color: purple;
			}
			</style>
			<template></template>
		`,
		'<template><!-- template comment --></template>',
		outdent`
			<script setup>;</script>
			<template></template>
		`,
	],
});
