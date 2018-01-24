'use strict';
const getDocsUrl = require('./utils/get-docs-url');
const domEventsJson = require('./utils/dom-events.json');

const eventTypes = new Set(Object.values(domEventsJson).reduce((accEvents, events) => accEvents.concat(events), []));

const getEventMethodName = memberExpression => {
	return memberExpression.property.name;
};

const getEventTypeName = eventMethodName => {
	return eventMethodName.substring('on'.length);
};

const fix = (fixer, sourceCode, assignmentNode, memberExpression) => {
	const eventTypeName = getEventTypeName(getEventMethodName(memberExpression));
	const eventObjectCode = sourceCode.getText(memberExpression.object);
	const fncCode = sourceCode.getText(assignmentNode.right);
	const fixedCodeStatement = `${eventObjectCode}.addEventListener('${eventTypeName}', ${fncCode})`;
	return fixer.replaceText(assignmentNode, fixedCodeStatement);
};

const isOnEvent = function (memberExpression) {
	if (memberExpression.type === 'MemberExpression') {
		const eventMethodName = getEventMethodName(memberExpression);
		if (eventMethodName.startsWith('on')) {
			const eventTypeName = getEventTypeName(eventMethodName);
			return eventTypes.has(eventTypeName);
		}
	}
	return false;
};

const create = context => {
	return {
		AssignmentExpression(node) {
			const memberExpression = node.left;
			if (isOnEvent(memberExpression, context, node)) {
				context.report({
					node,
					message: `Prefer addEventListener over ${getEventMethodName(memberExpression)}`,
					fix: fixer => fix(fixer, context.getSourceCode(), node, memberExpression)
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl()
		},
		fixable: 'code'
	}
};
