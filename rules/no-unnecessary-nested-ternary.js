import {findVariable} from '@eslint-community/eslint-utils';
import {
	getConditionalExpressionChildText,
	getLogicalExpressionChildText,
	getNegatedExpressionText,
	getParenthesizedRange,
	getPrimitiveLiteralValue,
	hasJavaScriptTypeAnnotations,
	hasPossibleSideEffect,
	isTypeScriptFile,
	needsSemicolon,
	unwrapTypeScriptExpression,
	withTypeInformation,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-nested-ternary';
const messages = {
	[MESSAGE_ID]: 'Do not use unnecessary nested ternary expressions.',
	simplify: 'Simplify this ternary expression (requires review).',
};

function isSameNode(left, right, sourceCode) {
	return sourceCode.getText(left) === sourceCode.getText(right);
}

function getReplacementText({
	context,
	node,
	left,
	operator,
	right,
	consequent,
	alternate,
	negateRight = false,
}) {
	const {sourceCode} = context;
	const testText = [
		getLogicalExpressionChildText(left, context, {operator, property: 'left'}),
		negateRight ? getNegatedExpressionText(right, context) : getLogicalExpressionChildText(right, context, {operator, property: 'right'}),
	].join(` ${operator} `);
	let text = `${testText} ? ${getConditionalExpressionChildText(consequent, context)} : ${getConditionalExpressionChildText(alternate, context)}`;

	if (needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
		text = `;${text}`;
	}

	return text;
}

function getProblem(context, node, replacement) {
	const problem = {
		node,
		messageId: MESSAGE_ID,
	};

	const preservedRanges = ['left', 'right', 'consequent', 'alternate'].map(property => getParenthesizedRange(replacement[property], context));
	if (!wouldRemoveComments(context, node, preservedRanges)) {
		problem.fix = fixer => fixer.replaceText(node, getReplacementText({
			context,
			node,
			...replacement,
		}));
	}

	return problem;
}

// Only simple subjects and strict primitive comparisons are modeled. Dynamic keys, optional chains, loose equality, and arbitrary expressions are deliberately unsupported.
function getSubject(node, parameter, argument) {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'Identifier') {
		return parameter ? (node.name === parameter ? argument : undefined) : `identifier:${node.name}`;
	}

	if (node.type === 'ThisExpression' && !parameter) {
		return 'this';
	}

	if (node.type === 'UnaryExpression' && node.operator === 'typeof') {
		const subject = getSubject(node.argument, parameter, argument);
		return subject && `typeof(${subject})`;
	}

	if (node.type !== 'MemberExpression' || node.optional || (!node.computed && node.property.type !== 'Identifier')) {
		return;
	}

	const subject = getSubject(node.object, parameter, argument);
	const property = node.computed ? getPrimitiveLiteralValue(node.property) : node.property.name;
	if (subject && property !== undefined) {
		return `${subject}[${JSON.stringify(String(property))}]`;
	}
}

function getLiteralTest(node, parameter, argument) {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'LogicalExpression' && node.operator === '&&') {
		// Either conjunct constrains a truthy result; callers reject explicit side effects in the whole test.
		return getLiteralTest(node.left, parameter, argument) ?? getLiteralTest(node.right, parameter, argument);
	}

	if (node.type === 'LogicalExpression' && node.operator === '||') {
		const left = getLiteralTest(node.left, parameter, argument);
		const right = getLiteralTest(node.right, parameter, argument);
		if (left && right && left.subject === right.subject) {
			return {subject: left.subject, values: [...left.values, ...right.values]};
		}

		return;
	}

	if (node.type !== 'BinaryExpression' || node.operator !== '===') {
		return;
	}

	for (const [subjectNode, valueNode] of [[node.left, node.right], [node.right, node.left]]) {
		const subject = getSubject(subjectNode, parameter, argument);
		const value = getPrimitiveLiteralValue(valueNode);
		if (subject && value !== undefined) {
			return {subject, values: [value]};
		}
	}
}

function getGuardExpression(functionNode) {
	if (
		!['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(functionNode.type)
		|| functionNode.async
		|| functionNode.generator
		|| functionNode.params.length !== 1
		|| functionNode.params[0].type !== 'Identifier'
	) {
		return;
	}

	let expression = functionNode.body;
	if (expression.type === 'BlockStatement') {
		if (expression.body.length !== 1 || expression.body[0].type !== 'ReturnStatement' || !expression.body[0].argument) {
			return;
		}

		expression = expression.body[0].argument;
	}

	return expression;
}

function getLocalGuard(node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), node.callee);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	if (definition?.type === 'Variable' && definition.node.id.type !== 'Identifier') {
		return {unsupported: true};
	}

	const functionNode = definition?.type === 'FunctionName' ? definition.node : unwrapTypeScriptExpression(definition?.node.init);
	if (!functionNode?.body) {
		return {};
	}

	// This is a shallow proof of a comparison-returning local guard, not general interprocedural purity analysis.
	const expression = getGuardExpression(functionNode);
	if (!expression || (definition.type === 'Variable' && definition.parent.kind !== 'const') || variable.references.some(reference => !reference.init && reference.isWrite())) {
		return {unsupported: true};
	}

	const subject = getSubject(node.arguments[0]);
	const test = subject && getLiteralTest(expression, functionNode.params[0].name, subject);
	return test && !hasPossibleSideEffect(expression, context) ? {test} : {unsupported: true};
}

function getTest(node, context) {
	node = unwrapTypeScriptExpression(node);
	const literalTest = getLiteralTest(node);
	if (literalTest && !hasPossibleSideEffect(node, context)) {
		return {...literalTest, pure: true};
	}

	if (
		node.type !== 'CallExpression'
		|| node.optional
		|| node.callee.type !== 'Identifier'
		|| node.arguments.length !== 1
		|| node.arguments[0].type === 'SpreadElement'
		|| !getSubject(node.arguments[0])
	) {
		return;
	}

	const local = getLocalGuard(node, context);
	if (local.test) {
		return {...local.test, pure: true};
	}

	if (local.unsupported) {
		return;
	}

	return withTypeInformation(node.callee, context, ({type, checker, program}) => {
		const compilerOptions = program.getCompilerOptions();
		// Without strict null checks, otherwise disjoint types can overlap through null or undefined.
		if (!(compilerOptions.strictNullChecks ?? compilerOptions.strict)) {
			return;
		}

		const signatures = type.getCallSignatures();
		const [signature] = signatures;
		// Overloads and generic instantiations can change after moving a call out of its original narrowed branch. Never use the already-narrowed argument type as an exclusivity proof.
		if (signatures.length !== 1 || signature.typeParameters?.length || signature.declaration?.typeParameters?.length) {
			return;
		}

		const predicate = checker.getTypePredicateOfSignature(signature);
		if (predicate?.kind === 1 && predicate.parameterIndex === 0 && predicate.type) {
			return {
				subject: getSubject(node.arguments[0]), type: predicate.type, checker, pure: false,
			};
		}
	});
}

function getPrimitiveType(type, checker) {
	// Only concrete primitive/literal bases establish a domain; assignability can hide `any` in unresolved types.
	const name = checker.getBaseTypeOfLiteralType(type).intrinsicName;
	if (!['string', 'number', 'boolean', 'bigint', 'symbol', 'null', 'undefined'].includes(name)) {
		return;
	}

	let {value} = type;
	if (name === 'boolean' && ['true', 'false'].includes(type.intrinsicName)) {
		value = type.intrinsicName === 'true';
	} else if (name === 'bigint' && value) {
		value = `${value.negative ? '-' : ''}${value.base10Value}`;
	}

	return {name, value};
}

function areTypesDisjoint(left, right, checker) {
	const leftTypes = left.isUnion() ? left.types : [left];
	const rightTypes = right.isUnion() ? right.types : [right];
	if (leftTypes.length > 1 || rightTypes.length > 1) {
		return leftTypes.every(left => rightTypes.every(right => areTypesDisjoint(left, right, checker)));
	}

	const leftPrimitive = getPrimitiveType(left, checker);
	const rightPrimitive = getPrimitiveType(right, checker);
	if (leftPrimitive && rightPrimitive) {
		return leftPrimitive.name !== rightPrimitive.name
			|| (leftPrimitive.value !== undefined && rightPrimitive.value !== undefined && leftPrimitive.value !== rightPrimitive.value);
	}

	// Unrelated interfaces may overlap. Only concrete objects with required primitive-literal discriminants are modeled; opaque type roots are unsupported.
	const objectTypeFlag = 1_048_576; // TypeScript's TypeFlags.Object.
	if (left.flags !== objectTypeFlag || right.flags !== objectTypeFlag) {
		return false;
	}

	const isLiteralType = type => (type.isUnion() ? type.types : [type]).every(type => getPrimitiveType(type, checker)?.value !== undefined);
	const optionalSymbolFlag = 16_777_216; // TypeScript's SymbolFlags.Optional.
	return left.getProperties().some(property => {
		const other = right.getProperty(property.name);
		if (!other || property.flags % (optionalSymbolFlag * 2) >= optionalSymbolFlag || other.flags % (optionalSymbolFlag * 2) >= optionalSymbolFlag) {
			return false;
		}

		const leftType = checker.getTypeOfSymbol(property);
		const rightType = checker.getTypeOfSymbol(other);
		return isLiteralType(leftType) && isLiteralType(rightType) && areTypesDisjoint(leftType, rightType, checker);
	});
}

function areTestsExclusive(left, right, context) {
	if (!left || !right || left.subject !== right.subject) {
		return false;
	}

	if (left.values && right.values) {
		// Strict equality treats positive and negative zero as the same value.
		return left.values.every(left => right.values.every(right => left !== right));
	}

	return Boolean(left.type && right.type && withTypeInformation(context.sourceCode.ast, context, () => areTypesDisjoint(left.type, right.type, left.checker)));
}

function isPureTest(node, context) {
	return !hasPossibleSideEffect(node, context) || getTest(node, context)?.pure === true;
}

function requireReview(problem) {
	if (problem.fix) {
		problem.suggest = [{messageId: 'simplify', fix: problem.fix}];
		delete problem.fix;
	}

	return problem;
}

function getChainProblem(node, context, needsTypeReview) {
	const {sourceCode} = context;
	const chain = [];
	let fallback = node;
	while (fallback.type === 'ConditionalExpression') {
		chain.push(fallback);
		fallback = fallback.alternate;
	}

	if (chain.length < 2) {
		return;
	}

	const tests = chain.map(branch => getTest(branch.test, context));
	const getProblemFromEdits = (edits, affectedTests) => {
		const problem = {node, messageId: MESSAGE_ID};
		if (edits.some(({editRange, preserved}) => wouldRemoveComments(context, editRange, preserved))) {
			return problem;
		}

		problem.fix = function * (fixer) {
			for (const {editRange, text} of edits) {
				yield fixer.replaceTextRange(editRange, text);
			}
		};

		return needsTypeReview || affectedTests.some(test => !test.pure) ? requireReview(problem) : problem;
	};

	for (let index = 2; index < chain.length; index++) {
		const branch = chain[index];
		if (isSameNode(node.consequent, branch.consequent, sourceCode) && tests.slice(1, index).every(test => areTestsExclusive(tests[index], test, context))) {
			const leftText = getLogicalExpressionChildText(node.test, context, {operator: '||', property: 'left'});
			const rightText = getLogicalExpressionChildText(branch.test, context, {operator: '||', property: 'right'});
			let text = `${leftText} || ${rightText}`;
			if (needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
				text = `;${text}`;
			}

			return getProblemFromEdits([
				{editRange: getParenthesizedRange(node.test, context), text, preserved: [getParenthesizedRange(node.test, context)]},
				{
					editRange: getParenthesizedRange(branch, context),
					text: getConditionalExpressionChildText(branch.alternate, context),
					preserved: [getParenthesizedRange(branch.test, context), getParenthesizedRange(branch.alternate, context)],
				},
			], tests.slice(1, index + 1));
		}
	}

	if (tests.slice(1).some(test => !areTestsExclusive(tests[0], test, context))) {
		return;
	}

	if (isSameNode(node.consequent, fallback, sourceCode)) {
		let text = sourceCode.getText(node.alternate);
		if (needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
			text = `;${text}`;
		}

		return getProblemFromEdits([{editRange: sourceCode.getRange(node), text, preserved: [node.alternate]}], tests);
	}

	const inner = node.consequent;
	if (inner.type !== 'ConditionalExpression' || !isPureTest(inner.test, context)) {
		return;
	}

	const negateRight = isSameNode(inner.consequent, fallback, sourceCode);
	if (!negateRight && !isSameNode(inner.alternate, fallback, sourceCode)) {
		return;
	}

	const problem = getProblem(context, node, {
		left: node.test,
		operator: '&&',
		right: inner.test,
		negateRight,
		consequent: negateRight ? inner.alternate : inner.consequent,
		alternate: node.alternate,
	});
	// Type domains do not prove guard purity, and merging typed branches can lose narrowing. Such changes require an explicit suggestion review.
	return needsTypeReview || tests.some(test => !test.pure) ? requireReview(problem) : problem;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const needsTypeReview = isTypeScriptFile(context.filename)
		|| Boolean(sourceCode.parserServices.esTreeNodeToTSNodeMap)
		|| hasJavaScriptTypeAnnotations(context);

	context.on('ConditionalExpression', node => {
		const {test, consequent, alternate} = node;

		if (
			consequent.type === 'ConditionalExpression'
			&& isSameNode(consequent.alternate, alternate, sourceCode)
		) {
			return getProblem(context, node, {
				left: test,
				operator: '&&',
				right: consequent.test,
				consequent: consequent.consequent,
				alternate: consequent.alternate,
			});
		}

		if (
			alternate.type === 'ConditionalExpression'
			&& isSameNode(consequent, alternate.consequent, sourceCode)
		) {
			return getProblem(context, node, {
				left: test,
				operator: '||',
				right: alternate.test,
				consequent,
				alternate: alternate.alternate,
			});
		}

		const chainProblem = getChainProblem(node, context, needsTypeReview);
		if (chainProblem) {
			return chainProblem;
		}

		// These adjacent inversions preserve short-circuit evaluation, including effectful conditions.
		if (
			consequent.type === 'ConditionalExpression'
			&& isSameNode(consequent.consequent, alternate, sourceCode)
		) {
			const problem = getProblem(context, node, {
				left: test,
				operator: '&&',
				right: consequent.test,
				negateRight: true,
				consequent: consequent.alternate,
				alternate,
			});
			return needsTypeReview ? requireReview(problem) : problem;
		}

		if (
			alternate.type === 'ConditionalExpression'
			&& isSameNode(consequent, alternate.alternate, sourceCode)
		) {
			const problem = getProblem(context, node, {
				left: test,
				operator: '||',
				right: alternate.test,
				negateRight: true,
				consequent,
				alternate: alternate.consequent,
			});
			return needsTypeReview ? requireReview(problem) : problem;
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary nested ternary expressions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
