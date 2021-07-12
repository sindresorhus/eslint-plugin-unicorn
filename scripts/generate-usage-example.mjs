// Automatically regenerates the usage example in readme.md.

import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import outdent from 'outdent';
import package_ from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathReadme = path.resolve(__dirname, '../readme.md');
const readmeContents = readFileSync(pathReadme, 'utf8');

const exampleConfig = {
	name: 'my-awesome-project',
	eslintConfig: package_.configs.recommended,
};

writeFileSync(
	pathReadme,
	readmeContents.replace(
		/<!-- USAGE_EXAMPLE_START -->.*<!-- USAGE_EXAMPLE_END -->/s,
		outdent`
			<!-- USAGE_EXAMPLE_START -->
			\`\`\`json
			${JSON.stringify(exampleConfig, undefined, '\t')}
			\`\`\`
			<!-- USAGE_EXAMPLE_END -->
		`,
	),
);
