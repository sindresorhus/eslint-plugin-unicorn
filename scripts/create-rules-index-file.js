import fs from 'node:fs';
import path from 'node:path';
import {camelCase} from 'lodash-es';
import {outdent} from 'outdent';

const DIRECTORY = new URL('../rules/', import.meta.url)

const content = ''
const rules = fs.readdirSync(DIRECTORY, {withFileTypes: true})
	.filter(file => file.isFile() && file.name !== '.DS_Store' && file.name !== 'index.js')
	.map(file => {
		const filename = file.name;
		const id = path.basename(filename, '.js');
		const specifier = camelCase(id);

		return {filename, id, specifier};
	})

fs.writeFileSync(
	new URL('index.js', DIRECTORY),
	outdent`
		// Generated file, DO NOT edit
		import {createRule} from './utils/rule.js';

		${rules.map(({filename, specifier}) => `import ${specifier} from './${filename}';`).join('\n')}

		const rules = {
		${rules.map(({id, specifier}) => `\t'${id}': createRule(${specifier}, '${id}')`).join(',\n')}
		};

		export default rules;
	`,
)
