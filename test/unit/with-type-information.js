import test from 'node:test';
import {Linter} from 'eslint';
import {withTypeInformation} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

/*
Return what `withTypeInformation` gives back for each `marker` identifier, using a callback that reads the type as a string.
*/
const getResults = (code, {typeAware = true} = {}) => {
	const results = [];
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: typeAware ? {projectService: {allowDefaultProject: ['*.ts']}} : {},
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'Identifier[name="marker"]'(node) {
								results.push(withTypeInformation(node, context, ({type, checker, program}) => ({
									type: checker.typeToString(type),
									isProgramChecker: program.getTypeChecker() === checker,
								})));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	}, 'file.ts');

	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return results;
};

const createContext = parserServices => ({sourceCode: {parserServices}});

test('calls the callback with the type, checker, and program', t => {
	t.assert.deepStrictEqual(getResults('declare const marker: string | number;'), [{type: 'string | number', isProgramChecker: true}]);
	t.assert.deepStrictEqual(getResults('const marker = new Map<string, boolean>();'), [{type: 'Map<string, boolean>', isProgramChecker: true}]);
});

test('returns `undefined` without full type information', t => {
	t.assert.deepStrictEqual(getResults('declare const marker: string;', {typeAware: false}), [undefined]);
	t.assert.strictEqual(withTypeInformation({}, createContext(undefined), () => 'called'), undefined);
	t.assert.strictEqual(withTypeInformation({}, createContext({}), () => 'called'), undefined);
});

test('returns `undefined` when TypeScript throws', t => {
	const program = {getTypeChecker: () => ({})};
	const throwingGetTypeAtLocation = createContext({
		program,
		getTypeAtLocation() {
			throw new Error('Unmapped node');
		},
	});
	t.assert.strictEqual(withTypeInformation({}, throwingGetTypeAtLocation, () => 'called'), undefined);

	const context = createContext({program, getTypeAtLocation: () => ({})});
	t.assert.strictEqual(withTypeInformation({}, context, () => {
		throw new Error('Checker failure');
	}), undefined);
	t.assert.strictEqual(withTypeInformation({}, context, () => 'called'), 'called');
});
