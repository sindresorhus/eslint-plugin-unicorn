import fs from 'node:fs';
import path from 'node:path';

const DIRECTORY = new URL('../rules/', import.meta.url);

const files = fs.readdirSync(DIRECTORY, {withFileTypes: true})
	.filter(file => file.isFile() && file.name.endsWith('.js') && file.name !== 'index.js')
	.map(file => file.name)
	.toSorted();

const content = files
	.map(file => `export {default as '${path.basename(file, '.js')}'} from './${file}';`)
	.join('\n');

fs.writeFileSync(
	new URL('index.js', DIRECTORY),
	'// Generated file, DO NOT edit\n\n' + content + '\n',
);
