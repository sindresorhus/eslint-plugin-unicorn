const STYLE_ABOVE = 'above';
const STYLE_BEFORE = 'before';
const STYLE_AFTER = 'after';
const STYLE_MIXED = 'mixed';
const styles = new Set([
	STYLE_ABOVE,
	STYLE_BEFORE,
	STYLE_AFTER,
]);

const MESSAGE_ID = 'consistent-export-decorator-position';
const messages = {
	[MESSAGE_ID]: 'Expected export decorators to be positioned `{{expected}}`, but found `{{actual}}`.',
};

const isKeywordToken = keyword => token => token.type === 'Keyword' && token.value === keyword;
const isClassDeclarationWithDecorators = node =>
	node?.type === 'ClassDeclaration'
	&& node.decorators?.length > 0;

const isInRange = (range, nodeOrToken, sourceCode) => {
	const [start, end] = range;
	const [nodeStart, nodeEnd] = sourceCode.getRange(nodeOrToken);
	return nodeStart >= start && nodeEnd <= end;
};

const getDecoratorTexts = (decorators, sourceCode, separator) =>
	decorators
		.map(decorator => sourceCode.getText(decorator))
		.join(separator);

const getIndent = (sourceCode, token) =>
	sourceCode.lines[sourceCode.getLoc(token).start.line - 1].match(/^\s*/v)[0];

const getExportText = (exportDeclaration, sourceCode) => {
	if (exportDeclaration.type !== 'ExportDefaultDeclaration') {
		return 'export';
	}

	const exportToken = sourceCode.getFirstToken(exportDeclaration, isKeywordToken('export'));
	const defaultToken = sourceCode.getTokenAfter(exportToken, isKeywordToken('default'));
	const [exportStart] = sourceCode.getRange(exportToken);
	const [, defaultEnd] = sourceCode.getRange(defaultToken);
	return sourceCode.text.slice(exportStart, defaultEnd);
};

const getActualStyle = ({decorators, exportToken, context}) => {
	const {sourceCode} = context;
	const isAfterExport = decorator => sourceCode.getRange(decorator)[0] > sourceCode.getRange(exportToken)[0];

	if (decorators.some(decorator => isAfterExport(decorator))) {
		return decorators.every(decorator => isAfterExport(decorator))
			? STYLE_AFTER
			: STYLE_MIXED;
	}

	const exportStartLine = sourceCode.getLoc(exportToken).start.line;
	if (sourceCode.getLoc(decorators.at(-1)).end.line !== exportStartLine) {
		return STYLE_ABOVE;
	}

	return decorators.every(decorator => sourceCode.getLoc(decorator).end.line === exportStartLine)
		? STYLE_BEFORE
		: STYLE_MIXED;
};

const getExpectedHeadText = ({style, decorators, exportText, sourceCode, indent}) => {
	switch (style) {
		case STYLE_ABOVE: {
			return `${getDecoratorTexts(decorators, sourceCode, `\n${indent}`)}\n${indent}${exportText} `;
		}

		case STYLE_BEFORE: {
			return `${getDecoratorTexts(decorators, sourceCode, ' ')} ${exportText} `;
		}

		case STYLE_AFTER: {
			return `${exportText} ${getDecoratorTexts(decorators, sourceCode, ' ')} `;
		}

		// No default
	}
};

const canFix = ({headRange, decorators, exportToken, defaultToken, sourceCode}) => {
	const isInsideDecorator = nodeOrToken => decorators.some(decorator => isInRange(sourceCode.getRange(decorator), nodeOrToken, sourceCode));
	const allowedTokens = new Set([
		exportToken,
		defaultToken,
	].filter(Boolean));

	const hasUnexpectedToken = sourceCode.ast.tokens
		.filter(token => isInRange(headRange, token, sourceCode))
		.some(token => !allowedTokens.has(token) && !isInsideDecorator(token));

	if (hasUnexpectedToken) {
		return false;
	}

	return sourceCode.getAllComments()
		.filter(comment => isInRange(headRange, comment, sourceCode))
		.every(comment => isInsideDecorator(comment));
};

const getProblem = ({exportDeclaration, expectedStyle, context}) => {
	const {sourceCode} = context;
	const {declaration} = exportDeclaration;
	const {decorators} = declaration;
	const exportToken = sourceCode.getFirstToken(exportDeclaration, isKeywordToken('export'));
	const actualStyle = getActualStyle({
		decorators,
		exportToken,
		context,
	});

	if (actualStyle === expectedStyle) {
		return;
	}

	const problem = {
		node: decorators[0],
		messageId: MESSAGE_ID,
		data: {
			expected: expectedStyle,
			actual: actualStyle,
		},
	};

	const classToken = sourceCode.getFirstToken(declaration, isKeywordToken('class'));
	const defaultToken = exportDeclaration.type === 'ExportDefaultDeclaration'
		? sourceCode.getTokenAfter(exportToken, isKeywordToken('default'))
		: undefined;
	const headRange = [
		Math.min(sourceCode.getRange(decorators[0])[0], sourceCode.getRange(exportToken)[0]),
		sourceCode.getRange(classToken)[0],
	];

	if (!canFix({
		headRange,
		decorators,
		exportToken,
		defaultToken,
		sourceCode,
	})) {
		return problem;
	}

	return {
		...problem,
		fix: fixer => fixer.replaceTextRange(
			headRange,
			getExpectedHeadText({
				style: expectedStyle,
				decorators,
				exportText: getExportText(exportDeclaration, sourceCode),
				sourceCode,
				indent: getIndent(sourceCode, exportToken),
			}),
		),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const expectedStyle = context.options[0];

	context.on(['ExportDefaultDeclaration', 'ExportNamedDeclaration'], exportDeclaration => {
		if (!isClassDeclarationWithDecorators(exportDeclaration.declaration)) {
			return;
		}

		return getProblem({
			exportDeclaration,
			expectedStyle,
			context,
		});
	});
};

const schema = [
	{
		enum: [...styles],
		description: 'Decorator position relative to the export declaration.',
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent decorator position on exported classes.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [STYLE_ABOVE],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
