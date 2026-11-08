import fs from 'node:fs';
import {inspect} from 'node:util';
import * as rawRules from '../rules/index.js';

// These rules inherit metadata from the installed ESLint version.
const eagerRules = new Set([
	'expiring-todo-comments',
	'id-match',
	'logical-assignment-operators',
	'operator-assignment',
]);

const imports = [
	'import createPlugin from \'../create-plugin.js\';',
	'import {createLazyRule} from \'../rules/rule/to-eslint-rule.js\';',
];
const entries = [];

for (const [ruleId, rule] of Object.entries(rawRules)) {
	if (eagerRules.has(ruleId)) {
		const variableName = `rule${entries.length}`;
		imports.push(`import ${variableName} from '../rules/${ruleId}.js';`);
		entries.push(`\t'${ruleId}': ${variableName},`);
		continue;
	}

	const metadata = inspect(rule.meta, {
		depth: Infinity,
		compact: true,
		breakLength: Infinity,
		maxArrayLength: Infinity,
		maxStringLength: Infinity,
	});
	entries.push(`\t'${ruleId}': createLazyRule('${ruleId}', ${metadata}),`);
}

const directory = new URL('../dist/', import.meta.url);
fs.mkdirSync(directory, {recursive: true});
fs.writeFileSync(
	new URL('index.js', directory),
	'// Generated file, DO NOT edit\n\n' + imports.join('\n') + '\n\nexport default createPlugin({\n' + entries.join('\n') + '\n});\n',
);
