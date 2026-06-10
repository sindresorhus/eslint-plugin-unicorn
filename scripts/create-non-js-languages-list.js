import fs from 'node:fs';
import * as rules from '../rules/index.js';

// Maps the plugin part of a `meta.languages` identifier (e.g. `css` in `css/css`) to a column label. `js` is the baseline and intentionally omitted.
const languageLabels = {
	css: 'CSS',
	html: 'HTML',
	json: 'JSON',
	markdown: 'Markdown',
};
const columnOrder = ['css', 'html', 'json', 'markdown'];

const beginMarker = '<!-- begin auto-generated non-js languages list -->';
const endMarker = '<!-- end auto-generated non-js languages list -->';

const readmeUrl = new URL('../readme.md', import.meta.url);

const ruleLink = name => `[\`${name}\`](docs/rules/${name}.md)`;

function getRules() {
	const anyFile = [];
	const contentAware = [];

	for (const [name, rule] of Object.entries(rules)) {
		const languages = rule.meta?.languages;

		if (!languages) {
			continue;
		}

		if (languages.includes('*')) {
			anyFile.push(name);
			continue;
		}

		// Collapse `plugin/dialect` to its plugin and drop the `js` baseline.
		const plugins = new Set(
			languages
				.map(language => language.split('/', 1)[0])
				.filter(plugin => plugin !== 'js'),
		);

		if (plugins.size > 0) {
			contentAware.push({name, plugins});
		}
	}

	anyFile.sort();
	contentAware.sort((a, b) => a.name.localeCompare(b.name));

	return {anyFile, contentAware};
}

function generate() {
	const {anyFile, contentAware} = getRules();
	const columns = columnOrder.filter(plugin => contentAware.some(({plugins}) => plugins.has(plugin)));

	const lines = [
		'These rules work on **any** file type:',
		'',
		...anyFile.map(name => `- ${ruleLink(name)}`),
		'',
		'These rules also work on specific non-JavaScript languages:',
		'',
		`| Name | ${columns.map(plugin => languageLabels[plugin]).join(' | ')} |`,
		`| :-- | ${columns.map(() => ':-:').join(' | ')} |`,
		...contentAware.map(({name, plugins}) =>
			`| ${ruleLink(name)} | ${columns.map(plugin => plugins.has(plugin) ? '✅' : '').join(' | ')} |`),
	];

	return lines.join('\n');
}

const readme = fs.readFileSync(readmeUrl, 'utf8');
const begin = readme.indexOf(beginMarker);
const end = readme.indexOf(endMarker);

if (begin === -1 || end === -1 || end < begin) {
	throw new Error('Could not find the non-JavaScript languages list markers in `readme.md`.');
}

const updated = `${readme.slice(0, begin + beginMarker.length)}\n\n${generate()}\n\n${readme.slice(end)}`;

if (process.argv.includes('--check')) {
	if (updated !== readme) {
		console.error('The non-JavaScript languages list in `readme.md` is out of date. Run `npm run fix:non-js-languages`.');
		process.exitCode = 1;
	}
} else if (updated !== readme) {
	fs.writeFileSync(readmeUrl, updated);
}
