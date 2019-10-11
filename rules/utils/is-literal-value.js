'use strict';
module.exports = value => node => node && node.type === 'Literal' && node.value === value;
