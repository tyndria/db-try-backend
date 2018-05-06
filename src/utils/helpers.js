export const isAllowed = (operation) => operation ? operation.allow : true;

export const recognizeRelations = (schemas) => {
  const relations = {};
  let primarySchemeName = '';
  schemas.forEach((schema) => {
    schema.fields.forEach(({name, type}) => {
      if (type === 'Id') {
        primarySchemeName = name;
        relations.foreign = schema;
      }
    })
  })

  if (primarySchemeName) {
    relations.primary = schemas.find(({name}) => name.toLowerCase() === primarySchemeName.toLowerCase());
  }

  return relations;
}

export const mergeStatistics = (result, fields, ...statistics) => {
  return fields.reduce((res, field) => {
    res[field] = statistics.reduce((res, statistic) => res + statistic[field], 0) / statistics.length;
    return res;
  }, result);
}
