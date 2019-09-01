// https://github.com/yannickcr/eslint-plugin-react/blob/master/lib/util/variable.js#L27-L52
const getVariablesInScope = context => {
  let scope = context.getScope();
  let {variables} = scope;

  while (scope.type !== 'global') {
    scope = scope.upper;
    variables = variables.concat(scope.variables);
  }

  if (scope.childScopes.length > 0) {
    variables = scope.childScopes[0].variables.concat(variables);

    if (scope.childScopes[0].childScopes.length > 0) {
      variables = scope.childScopes[0].childScopes[0].variables.concat(variables);
    }
  }

  return variables.reverse();
};

module.exports = getVariablesInScope;
