'use strict';

const {isExpressionStatement} = require('../ast/index.js');

const isValueNotUsable = node => isExpressionStatement(node.parent);
module.exports = isValueNotUsable;
