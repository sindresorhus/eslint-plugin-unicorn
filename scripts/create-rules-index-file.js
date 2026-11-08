import fs from 'node:fs';
import path from 'node:path';

const DIRECTORY = new URL('../rules/', import.meta.url);

const files = fs.readdirSync(DIRECTORY, {withFileTypes: true})
	.filter(file => file.isFile() && file.name.endsWith('.js') && file.name !== 'index.js')
	.map(file => file.name)
	.toSorted((first, second) => first.localeCompare(second));

const content = files
	.map(file => {
		const ruleId = path.basename(file, '.js');
		const exportName = ruleId.includes('-') ? `'${ruleId}'` : ruleId;
		return `export {default as ${exportName}} from './${file}';`;
	})
	.join('\n');

fs.writeFileSync(
	new URL('index.js', DIRECTORY),
	'// Generated file, DO NOT edit\n\n' + content + '\n',
);
