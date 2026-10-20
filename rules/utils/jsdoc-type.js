import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction} from '../ast/index.js';
import {parseJSDocumentType} from './parse-jsdoc-type.js';
import {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';
import {
	getJSDocumentDelimitedEnd,
	getJSDocumentTags,
	skipJSDocumentTemplateWhitespace,
} from './jsdoc.js';

const commentCaches = new WeakMap();
const parameterTags = new Set(['param', 'arg', 'argument']);
const returnTags = new Set(['return', 'returns']);
const parameterNamePattern = /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*/v;
const propertyTypes = new Set(['Property', 'PropertyDefinition', 'AccessorProperty']);
const exportTypes = new Set(['ExportNamedDeclaration', 'ExportDefaultDeclaration']);

/**
Parse a supported tag while preserving the source range of a parameter name.
*/
function parseTag(text, {tag, end}, offset) {
	let start = skipJSDocumentTemplateWhitespace(text, tag.contentStart, end);
	let type;
	if (text[start] === '{') {
		const typeEnd = getJSDocumentDelimitedEnd(text, start, end, '{');
		if (typeEnd === undefined) {
			return {tag: tag.name};
		}

		type = parseJSDocumentType(text.slice(start + 1, typeEnd - 1).replaceAll(/\r?\n[^\S\n]*\*?/gv, '\n'));
		start = skipJSDocumentTemplateWhitespace(text, typeEnd, end);
	} else if (!parameterTags.has(tag.name)) {
		return {tag: tag.name};
	}

	let optional = false;
	let name;
	let nameRange;
	if (parameterTags.has(tag.name)) {
		optional = text[start] === '[';
		const nameEnd = optional ? getJSDocumentDelimitedEnd(text, start, end, '[') : end;
		if (nameEnd === undefined) {
			return;
		}

		if (optional) {
			start++;
		}

		const match = parameterNamePattern.exec(text.slice(start, nameEnd));
		if (!match) {
			return;
		}

		name = match[0];
		const afterName = start + name.length;
		const next = skipJSDocumentTemplateWhitespace(text, afterName, nameEnd);
		if (
			optional
				? ![']', '='].includes(text[next])
				: afterName < end && !/\s/v.test(text[afterName])
		) {
			return;
		}

		nameRange = [offset + start, offset + afterName];
	}

	return {
		tag: tag.name, name, type, optional, nameRange,
	};
}

/**
Get parsed type tags from a documentation comment, shared across rules for this source file.
*/
function getCommentTags(comment, context) {
	const {sourceCode} = context;
	let cache = commentCaches.get(sourceCode);
	if (!cache) {
		cache = new WeakMap();
		commentCaches.set(sourceCode, cache);
	}

	if (!cache.has(comment)) {
		const tags = getJSDocumentTags(comment.value);
		const parsedTags = tags.some(({tag}) => tag.name === 'typedef' || tag.name === 'callback')
			? []
			: tags.map(({tag}, index) => parseTag(comment.value, {
				tag,
				end: tags[index + 1]?.lineStart ?? comment.value.length,
			}, sourceCode.getRange(comment)[0] + 2)).filter(Boolean);
		cache.set(comment, parsedTags);
	}

	return cache.get(comment);
}

/**
Find the closest directly attached documentation comment among a declaration and its wrappers.
*/
function getDocumentationTags(nodes, context) {
	for (const node of nodes) {
		const comment = context.sourceCode.getCommentsBefore(node).at(-1);
		if (comment) {
			return comment.type === 'Block' && comment.value.startsWith('*')
				? getCommentTags(comment, context)
				: [];
		}
	}

	return [];
}

/**
Include a declaration's export wrapper when looking for its documentation.
*/
function withExport(node) {
	return exportTypes.has(node.parent?.type) ? [node, node.parent] : [node];
}

/**
Get a function's documentation owners without searching enclosing functions or arbitrary expressions.
*/
function getFunctionOwners(node) {
	const owners = [node];
	while (isTypeScriptExpressionWrapper(node.parent) && node.parent.expression === node) {
		node = node.parent;
		owners.push(node);
	}

	const {parent} = node;
	if (parent?.type === 'VariableDeclarator' && parent.init === node) {
		return parent.parent.declarations.length === 1
			? [...owners, parent, ...withExport(parent.parent)]
			: [...owners, parent];
	}

	if (
		parent?.type === 'AssignmentExpression'
		&& parent.operator === '='
		&& parent.right === node
		&& parent.parent.type === 'ExpressionStatement'
	) {
		return [...owners, parent, parent.parent];
	}

	if (propertyTypes.has(parent?.type) || parent?.type === 'MethodDefinition') {
		return [...owners, parent];
	}

	return exportTypes.has(parent?.type) ? [...owners, parent] : owners;
}

/**
Select one unambiguous applicable tag's type and parameter metadata.
*/
function getAnnotation(tags, predicate) {
	const matches = tags.filter(tag => predicate(tag));
	if (matches.length === 1) {
		const {type, optional, nameRange} = matches[0];
		return {type, optional, nameRange};
	}
}

/**
Get a simple parameter's inline or named documentation tag.
*/
function getParameterAnnotation(node, context) {
	const {parent} = node;
	const parameter = parent?.type === 'AssignmentPattern' && parent.left === node ? parent : node;
	const functionNode = parameter.parent;
	if (!functionNode || !isFunction(functionNode) || !functionNode.params.includes(parameter)) {
		return;
	}

	const inline = getAnnotation(getDocumentationTags([node, parameter], context), tag => tag.tag === 'type');
	const named = getAnnotation(getDocumentationTags(getFunctionOwners(functionNode), context), tag => parameterTags.has(tag.tag) && tag.name === node.name);
	const annotation = inline?.type ? {...inline, nameRange: named?.nameRange} : named;
	if (!annotation) {
		return;
	}

	return {
		...annotation,
		type: annotation.type?.kind === 'optional' ? annotation.type.element : annotation.type,
		optional: [inline, named].some(annotation => annotation?.optional || annotation?.type?.kind === 'optional'),
	};
}

/**
Get a parameter tag's name range even when its type is omitted or a native TypeScript annotation takes precedence for inference.
*/
function getJSDocumentParameterNameRange(node, context) {
	return getParameterAnnotation(node, context)?.nameRange;
}

/**
Keep native assertions authoritative when they wrap an initializer.
*/
function hasNativeTypeAssertion(node) {
	while (isTypeScriptExpressionWrapper(node)) {
		if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
			return true;
		}

		node = node.expression;
	}

	return false;
}

/**
Get a directly documented binding or property type, resolving simple identifier references to their declaration.
*/
function getJSDocumentTypeAnnotation(node, context) {
	if (!node || node.typeAnnotation) {
		return;
	}

	const {parent} = node;
	let owners;
	if (propertyTypes.has(node.type)) {
		if (hasNativeTypeAssertion(node.value)) {
			return;
		}

		owners = [node];
	} else if (node.type === 'Identifier') {
		if (parent?.type === 'VariableDeclarator' && parent.id === node) {
			if (hasNativeTypeAssertion(parent.init)) {
				return;
			}

			owners = parent.parent.declarations.length === 1
				? [node, parent, ...withExport(parent.parent)]
				: [node, parent];
		} else {
			const annotation = getParameterAnnotation(node, context);
			if (annotation?.type) {
				return annotation;
			}

			const variable = findVariable(context.sourceCode.getScope(node), node);
			const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
			return definition?.name !== node && definition?.name
				? getJSDocumentTypeAnnotation(definition.name, context)
				: undefined;
		}
	} else {
		return;
	}

	const annotation = getAnnotation(getDocumentationTags(owners, context), tag => tag.tag === 'type');
	return annotation?.type ? annotation : undefined;
}

/**
Get the explicit return type documented on a function or its declaration.
*/
function getJSDocumentReturnType(node, context) {
	if (!node || node.returnType) {
		return;
	}

	const owners = getFunctionOwners(node);
	if (owners.some(owner => owner.type === 'VariableDeclarator'
		? owner.id.typeAnnotation
		: propertyTypes.has(owner.type) && owner.typeAnnotation)) {
		return;
	}

	const annotation = getAnnotation(getDocumentationTags(owners, context), tag => returnTags.has(tag.tag));
	return annotation?.type ? annotation : undefined;
}

export {
	getJSDocumentParameterNameRange,
	getJSDocumentTypeAnnotation,
	getJSDocumentReturnType,
};
