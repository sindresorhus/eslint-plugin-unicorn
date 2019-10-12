'use strict';
module.exports = (node, value) => node && node.type === 'Literal' && node.value === value;
