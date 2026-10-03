import {fileURLToPath} from 'node:url';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-path2d');

// The TypeScript project service is shared within a test file, so the `strictNullChecks: false` project needs its own file.
const typeAwareWithoutStrictNullChecks = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			tsconfigRootDir: fileURLToPath(new URL('fixtures/prefer-path2d/', import.meta.url)),
			projectService: {
				allowDefaultProject: ['*.ts'],
				defaultProject: 'tsconfig.json',
			},
		},
	},
});

test({
	valid: [
		// Without `strictNullChecks`, type parameters are not wrapped in `NonNullable`, so their constraints are resolved directly
		typeAwareWithoutStrictNullChecks(outdent`
			function draw<Context extends OtherContext, OtherContext>(context: Context) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
	],
	invalid: [
		// The constraint chain reaches `CanvasRenderingContext2D` only through type information, which the syntax fallback cannot resolve
		{
			...typeAwareWithoutStrictNullChecks(outdent`
				type Contexts = {main: CanvasRenderingContext2D};

				function draw<Context extends OtherContext, OtherContext extends Contexts['main']>(context: Context) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`),
			errors: [{messageId: 'prefer-path2d'}],
		},
	],
});
