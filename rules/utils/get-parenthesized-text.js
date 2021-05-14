const {isParenthesized} = require('eslint-utils');

function getParenthesizedText (node, sourceCode) {
    const text = sourceCode.getText(node);
    return (
        isParenthesized(node, sourceCode) ||
        node.type === 'AwaitExpression' ||
        // Lower precedence, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
        node.type === 'AssignmentExpression' ||
        node.type === 'YieldExpression' ||
        node.type === 'SequenceExpression'
    ) ?
        `(${text})` : text;
};

module.exports = getParenthesizedText;
