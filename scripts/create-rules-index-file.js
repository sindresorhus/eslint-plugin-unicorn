import fs from 'node:fs';
import path from 'node:path';
import {inspect} from 'node:util';
import {camelCase} from 'change-case';

const DIRECTORY = new URL('../rules/', import.meta.url);

// These rules inherit metadata from the installed ESLint version.
const eagerRules = new Set([
	'expiring-todo-comments',
	'id-match',
	'logical-assignment-operators',
	'operator-assignment',
]);

const files = fs.readdirSync(DIRECTORY, {withFileTypes: true})
	.filter(file => file.isFile() && file.name.endsWith('.js') && file.name !== 'index.js')
	.map(file => file.name)
	.toSorted((first, second) => first.localeCompare(second));

const content = await Promise.all(files.map(async file => {
	const ruleId = path.basename(file, '.js');
	const exportName = ruleId.includes('-') ? `'${ruleId}'` : ruleId;
	if (eagerRules.has(ruleId)) {
		return `export {default as ${exportName}} from './${file}';`;
	}

	const {default: rule} = await import(new URL(file, DIRECTORY));
	const variableName = camelCase(ruleId);
	const serialized = inspect(rule.meta, {
		depth: Infinity,
		compact: true,
		breakLength: Infinity,
		maxArrayLength: Infinity,
		maxStringLength: Infinity,
	});
	return `const ${variableName} = createLazyRule('${ruleId}', ${serialized}); export {${variableName} as ${exportName}};`;
}));

fs.writeFileSync(
	new URL('index.js', DIRECTORY),
	'// Generated file, DO NOT edit\n\nimport {createLazyRule} from \'./rule/to-eslint-rule.js\';\n\n' + content.join('\n') + '\n',
);
