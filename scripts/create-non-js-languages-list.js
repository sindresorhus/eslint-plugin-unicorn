import fs from 'node:fs';
import * as rules from '../rules/index.js';
import unicorn from '../index.js';

/*
Generates the non-JavaScript languages part of `readme.md` from each rule's `meta.languages`: the list of rules that work on any file type, the overview table, and one section per language that splits its rules by whether the language's recommended preset enables them.

Run with `--check` to only verify that `readme.md` is up to date (used by `npm run lint`).
*/

// Maps the plugin part of a `meta.languages` identifier (e.g. `css` in `css/css`) to a column label. `js` is the baseline and intentionally omitted. The order is the order of the table columns and the per-language sections.
const languageLabels = {
	css: 'CSS',
	html: 'HTML',
	json: 'JSON',
	markdown: 'Markdown',
	toml: 'TOML',
	yml: 'YAML',
};

// Extra text shown at the top of a language's section in the per-language lists.
const languageNotes = {
	css: 'For more CSS rules, see [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn).',
};

const beginMarker = '<!-- begin auto-generated non-js languages list -->';
const endMarker = '<!-- end auto-generated non-js languages list -->';

const readmeUrl = new URL('../readme.md', import.meta.url);

const ruleLink = name => `[\`${name}\`](docs/rules/${name}.md)`;

// Splits the rules into those that work on any file type (`*`) and those that support specific non-JavaScript languages. Rules without `meta.languages` are JavaScript-only and skipped.
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

	anyFile.sort((first, second) => first.localeCompare(second));
	contentAware.sort((first, second) => first.name.localeCompare(second.name));

	return {anyFile, contentAware};
}

function generate() {
	const {anyFile, contentAware} = getRules();
	// Only show languages that at least one rule supports.
	const columns = Object.keys(languageLabels).filter(plugin => contentAware.some(({plugins}) => plugins.has(plugin)));

	const lines = [
		'These rules work on **any** file type:',
		'',
		...anyFile.map(name => `- ${ruleLink(name)}`),
		'',
		'These rules also work on specific non-JavaScript languages:',
		'',
		// The column headers link to the per-language sections below. GitHub creates the `#css` anchor from the `#### CSS` heading.
		`| Name | ${columns.map(plugin => `[${languageLabels[plugin]}](#${languageLabels[plugin].toLowerCase()})`).join(' | ')} |`,
		`| :-- | ${columns.map(() => ':-:').join(' | ')} |`,
		...contentAware.map(({name, plugins}) =>
			`| ${ruleLink(name)} | ${columns.map(plugin => plugins.has(plugin) ? '✅' : '').join(' | ')} |`),
	];

	for (const plugin of columns) {
		const label = languageLabels[plugin];
		// The preset names in `index.js` match the lowercased labels (for example, `yml` uses `recommended-yaml`).
		const presetName = `recommended-${label.toLowerCase()}`;
		const preset = unicorn.configs[presetName];

		if (!preset) {
			throw new Error(`No \`${presetName}\` preset in \`index.js\` for ${label}.`);
		}

		lines.push('', `#### ${label}`);

		const note = languageNotes[plugin];
		if (note) {
			lines.push('', note);
		}

		// Read the real preset instead of `meta.languages` and `meta.docs.recommended`, so the lists always match what the preset enables. The preset contains every compatible rule, including the any-file rules, and sets non-recommended rules to `off`.
		const names = Object.keys(preset.rules)
			.map(id => id.slice('unicorn/'.length))
			.toSorted((first, second) => first.localeCompare(second));
		const isEnabled = name => preset.rules[`unicorn/${name}`] === 'error';

		const groups = [
			[`Enabled by the [\`${presetName}\`](#non-javascript-recommended-configs) preset:`, names.filter(name => isEnabled(name))],
			['Opt-in:', names.filter(name => !isEnabled(name))],
		];

		for (const [heading, groupNames] of groups) {
			// Skip the heading of an empty group, for example when a language has no opt-in rules.
			if (groupNames.length === 0) {
				continue;
			}

			lines.push('', heading, '', ...groupNames.map(name => `- ${ruleLink(name)}: ${rules[name].meta.docs.description}`));
		}
	}

	return lines.join('\n');
}

const readme = fs.readFileSync(readmeUrl, 'utf8');
const begin = readme.indexOf(beginMarker);
const end = readme.indexOf(endMarker);

if (begin === -1 || end === -1 || end < begin) {
	throw new Error('Could not find the non-JavaScript languages list markers in `readme.md`.');
}

// Replace everything between the markers, keeping the markers themselves.
const updated = `${readme.slice(0, begin + beginMarker.length)}\n\n${generate()}\n\n${readme.slice(end)}`;

if (updated !== readme) {
	if (process.argv.includes('--check')) {
		console.error('The non-JavaScript languages list in `readme.md` is out of date. Run `npm run fix:non-js-languages`.');
		process.exitCode = 1;
	} else {
		fs.writeFileSync(readmeUrl, updated);
	}
}
