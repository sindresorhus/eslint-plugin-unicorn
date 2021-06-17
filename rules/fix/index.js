'use strict';

module.exports = {
	appendArgument: require('./append-argument.js'),
	switchNewExpressionToCallExpression: require('./switch-new-expression-to-call-expression.js'),
	removeMemberExpressionProperty: require('./remove-member-expression-property.js'),
	removeMethodCall: require('./remove-method-call.js')
};
