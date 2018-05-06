import config from 'config';
import mysql from 'mysql2/promise';
import isEmpty from 'lodash/isEmpty';
import sample from 'lodash/sample';
import {getRandom} from './query';
import {isAllowed, recognizeRelations, mergeStatistics} from './helpers';

const DEFAULT_EXPERIMENTS_NUMBER = 10;

export const processProjectMySQL = async (schemas, configs) => {
  const connection = await establishConnection();
  let statistics = {};

  const relations = recognizeRelations(schemas);
  if (!isEmpty(relations)) {
    statistics = await processOneToManySchemas(connection, relations, configs)
  } else {
    statistics = await processSchemas(connection, schemas, configs);
  }

  await endConnection(connection);

  return statistics;
};

const getPrimaryField = (fields) => fields.find(({type}) => type === 'Id');

async function processOneToManySchemas(connection, schemas, configs) {
  const statistics = { populate: 0 };

  const {primary, foreign} = schemas;

  const foreignConfig = configs[foreign._id] || {}
  const primaryConfig = configs[primary._id] || {};
  const experimentsNumber = foreignConfig.loopCount || primaryConfig.loopCount || DEFAULT_EXPERIMENTS_NUMBER;

  await createTable(connection, primary);
  await createTable(connection, foreign, primary.name);

  const {insertedDocumentsId: primaryIds, statistics: primaryStatistics} =
    await processScheme(connection, completeInsert, primary, primaryConfig, false);

  const completeForeignInsert = async (connection, schema) => {
    const insertSql = `INSERT INTO ${schema.name} SET ?`;
    const values = schema.fields.reduce((res, {name, type}) => {
      res[name] = (type === 'Id') ? sample(primaryIds) : getRandom(type);
      return res;
    }, {});
    return connection.query(insertSql, values);
  }

  const {insertedDocumentsId: foreignIds, statistics: foreignStatistics} =
    await processScheme(connection, completeForeignInsert, foreign, foreignConfig, false);

  const primaryField = getPrimaryField(foreign.fields);
  statistics.populate = isAllowed(primaryConfig.populate) &&
    (await countOperationTimeMS(connection, completeJoin, experimentsNumber, primaryIds, primary, foreign.name, primaryField.name));

  foreignStatistics.delete = isAllowed(foreignConfig.remove) &&
    (await countOperationTimeMS(connection, completeDelete, experimentsNumber, foreignIds, foreign));

  primaryStatistics.delete = isAllowed(primaryConfig.remove) &&
    (await countOperationTimeMS(connection, completeDelete, experimentsNumber, primaryIds, primary));

  await dropTable(connection, foreign);
  await dropTable(connection, primary);

  return mergeStatistics(statistics, ['create', 'read', 'update', 'delete'], foreignStatistics, primaryStatistics);
}

async function processSchemas(connection, schemas, configs) {
  const schema = schemas[0];

  await createTable(connection, schema);

  const {statistics} = await processScheme(connection, completeInsert, schema, configs[schema._id]);

  await dropTable(connection, schema);

  return statistics;
}

async function processScheme(connection, completeInsert, schema, config = {}, doesDelete = true) {
  let statistics = { create: 0, read: 0, update: 0, delete: 0 };

  const {dataCount, loopCount, create, read, update, remove} = config;

  const experimentsNumber = loopCount || DEFAULT_EXPERIMENTS_NUMBER;
  const initialDataNumber = dataCount || DEFAULT_EXPERIMENTS_NUMBER;

  const insertedDocumentsId = [];
  const executionTime = [];

  for (let i = 0; i < initialDataNumber; i++) {
    const hrstart = process.hrtime();

    const insertedObject = await completeInsert(connection, schema);
    insertedDocumentsId.push(insertedObject[0].insertId);

    const hrend = process.hrtime(hrstart);
    executionTime.push(hrend[1] / 1000000);
  }
  statistics.create = isAllowed(create) && executionTime.reduce((prev, curr) => prev + curr, 0) / initialDataNumber;

  statistics.read = isAllowed(read) &&
    (await countOperationTimeMS(connection, completeSelect, experimentsNumber, insertedDocumentsId, schema));

  statistics.update = isAllowed(update) &&
    (await countOperationTimeMS(connection, completeUpdate, experimentsNumber, insertedDocumentsId, schema));

  if (doesDelete) {
    statistics.delete = isAllowed(remove) &&
      (await countOperationTimeMS(connection, completeDelete, experimentsNumber, insertedDocumentsId, schema));
  }

  return {statistics, insertedDocumentsId};
}

async function createTable(connection, schema, primaryTableName = '') {
  return connection.query(getCreateTableSQLString(schema, primaryTableName));
}

async function dropTable(connection, schema) {
  return connection.query(`DROP TABLE ${schema.name}`);
}

async function completeInsert(connection, schema) {
  const insertSql = `INSERT INTO ${schema.name} SET ?`;
  const values = schema.fields.reduce((res, {name, type}) => {
    res[name] = getRandom(type);
    return res;
  }, {});
  return connection.query(insertSql, values);
}

async function completeJoin(connection, id, {name}, foreignTableName, primaryField) {
  const query = `SELECT * FROM ${name} INNER JOIN ${foreignTableName} 
    ON ${name}.id = ${foreignTableName}.${primaryField} AND ${name}.id = '${id}' `;
  return connection.query(query)
}

async function completeSelect(connection, id, {name}) {
  const query = `SELECT * FROM ${name} WHERE id = '${id}'`;
  return connection.query(query);
}

async function completeDelete(connection, id, {name}) {
  const query = `DELETE FROM ${name} WHERE id = ${id}`;
  return connection.query(query);
}

async function completeUpdate(connection, id, {name, fields}) {
  let query = ` UPDATE ${name} SET `;
  const fieldsToUpdate = fields.filter(({type}) => type !== 'Id');

  fieldsToUpdate.forEach(({name}, index) => {
    query += index === fieldsToUpdate.length - 1 ? `${name} = ?` : `${name} = ?, `;
  });
  query += ` WHERE id = ?`;

  let values = [];
  fieldsToUpdate.forEach(({type}) => {
    values.push([getRandom(type)]);
  });
  values.push(id);

  return connection.query(query, values);
}

function getCreateTableSQLString(schema, primaryTableName) {
  let foreignField = '';

  let query = ` CREATE TABLE ${schema.name} (id INTEGER not NULL AUTO_INCREMENT, `;
  schema.fields.forEach(({type, name}) => {
    query = `${query}${getFieldSQLString({type, name})}`;
    if (type === 'Id') {
      foreignField = name;
    }
  });
  if (primaryTableName && foreignField) {
    query = query + ` FOREIGN KEY (${foreignField}) REFERENCES ${primaryTableName}( id ), `;
  }
  query = query + ' PRIMARY KEY ( id ))';
  return query;
}

function getFieldSQLString({type, name}) {
  const fieldType = type.toLowerCase() === 'string' ? 'VARCHAR(255)' : 'INTEGER not NULL';
  return `${name} ${fieldType}, `;
}

async function establishConnection() {
  return mysql.createConnection(config.mysql.url);
}

async function endConnection(connection) {
  return connection.end();
}

async function countOperationTimeMS(connection, callOperation, EXPERIMENTS_NUMBER, ids, ...args) {
  const executionTime = [];
  for (let i = 0; i < EXPERIMENTS_NUMBER; i++) {
    const hrstart = process.hrtime();
    await callOperation(connection, ids[i], ...args);
    const hrend = process.hrtime(hrstart);
    executionTime.push(hrend[1] / 1000000);
  }
  return executionTime.reduce((prev, curr) => prev + curr, 0) / EXPERIMENTS_NUMBER;
}