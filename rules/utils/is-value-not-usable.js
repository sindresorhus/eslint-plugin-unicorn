'use strict';

const {isExpressionStatement} = require('../ast/index.js');

module.exports = node => isExpressionStatement(node.parent);
