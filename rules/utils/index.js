'use strict';

module.exports.isValidVariableName = name => /^[a-z$_][a-z$_0-9]*$/i.test(name);
