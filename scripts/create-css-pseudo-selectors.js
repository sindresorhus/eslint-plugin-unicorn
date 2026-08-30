import fs from 'node:fs';
import webref from '@webref/css';

const targetUrl = new URL('../rules/shared/standard-pseudo-selectors.js', import.meta.url);
const {selectors} = await webref.listAll();

const pseudoSelectors = [...new Set([
	...selectors
		.map(({name}) => name)
		.filter(name => name.startsWith(':'))
		.map(name => name.replace(/\(\)$/u, '')),
	// https://drafts.csswg.org/css-logical-1/#page
	':recto',
	':verso',
])].toSorted((first, second) => first.localeCompare(second));

const content = [
	'// Generated file, DO NOT edit',
	'',
	'export default [',
	...pseudoSelectors.map(selector => `\t'${selector}',`),
	'];',
	'',
].join('\n');

if (process.argv.includes('--check')) {
	if (fs.readFileSync(targetUrl, 'utf8') !== content) {
		console.error('The standard pseudo-selector list is out of date. Run `npm run fix:css-pseudo-selectors`.');
		process.exitCode = 1;
	}
} else {
	fs.writeFileSync(targetUrl, content);
}
