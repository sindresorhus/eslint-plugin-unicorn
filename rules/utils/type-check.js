import {findVariable} from '@eslint-community/eslint-utils';

export const isFunctionCall = (node, functionName) => node.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'Identifier'
	&& node.callee.name === functionName;

export const isStaticProperties = (node, object, properties) =>
	node.type === 'MemberExpression'
	&& !node.computed
	&& !node.optional
	&& node.object.type === 'Identifier'
	&& node.object.name === object
	&& node.property.type === 'Identifier'
	&& properties.has(node.property.name);

export const hasTypeAnnotation = (node, scope, predicate) => {
	const variable = findVariable(scope, node);
	return Boolean(variable) && variable.defs.some(definition => predicate(definition.name?.typeAnnotation?.typeAnnotation));
};
