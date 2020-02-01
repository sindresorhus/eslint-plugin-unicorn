'use strict';

module.exports = ({parent}) => !parent || parent.type === 'ExpressionStatement';
