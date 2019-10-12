'use strict';
module.exports = (node, value) => node.type === 'Literal' && node.value === value;
