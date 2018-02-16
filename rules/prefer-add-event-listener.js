'use strict';
const getDocsUrl = require('./utils/get-docs-url');
const domEventsJson = require('./utils/dom-events.json');

const nestedEvents = Object.keys(domEventsJson).map(key => domEventsJson[key]);
const eventTypes = new Set(nestedEvents.reduce((accEvents, events) => accEvents.concat(events), []));
const getEventMethodName = memberExpression => memberExpression.property.name;
const getEventTypeName = eventMethodName => eventMethodName.slice('on'.length);

const fix = (fixer, sourceCode, assignmentNode, memberExpression) => {
	const eventTypeName = getEventTypeName(getEventMethodName(memberExpression));
	const eventObjectCode = sourceCode.getText(memberExpression.object);
	const fncCode = sourceCode.getText(assignmentNode.right);
	const fixedCodeStatement = `${eventObjectCode}.addEventListener('${eventTypeName}', ${fncCode})`;
	return fixer.replaceText(assignmentNode, fixedCodeStatement);
};

const isOnEvent = memberExpression => {
	if (memberExpression.type === 'MemberExpression') {
		const eventMethodName = getEventMethodName(memberExpression);
		if (eventMethodName && eventMethodName.startsWith('on')) {
			return eventTypes.has(getEventTypeName(eventMethodName));
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
					message: `Prefer \`addEventListener\` over \`${getEventMethodName(memberExpression)}\``,
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
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
