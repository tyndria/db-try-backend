import config from 'config';
import mysql from 'mysql2/promise';
import {getRandom} from './query';

export const processProjectMySQL = async (schemas) => {
  const EXPERIMENTS_NUMBER = 10;
  const connection = await establishConnection();

  const statistics = await processSchemas(schemas[0]);

  await endConnection(connection);

  return statistics;

  async function processSchemas(schema) {
    await createTable(schema);

    const statistics = await processOperationSeq(schema);

    await dropTable(schema);

    return statistics;
  }

  async function processOperationSeq(schema) {
    let statistics = {
      create: 0,
      read: 0,
      update: 0,
      delete: 0
    };

    const insertedDocumentsId = [];

    const executionTime = [];
    for (let i = 0; i < EXPERIMENTS_NUMBER; i++) {
      const hrstart = process.hrtime();

      const insertedObject = await completeInsert(schema);
      insertedDocumentsId.push(insertedObject[0].insertId);

      const hrend = process.hrtime(hrstart);
      executionTime.push(hrend[1] / 1000000);
    }
    statistics.create = executionTime.reduce((prev, curr) => prev + curr, 0) / EXPERIMENTS_NUMBER;

    statistics.read = await countOperationTimeMS(completeSelect, insertedDocumentsId, schema);

    statistics.update = await countOperationTimeMS(completeUpdate, insertedDocumentsId, schema);

    statistics.delete = await countOperationTimeMS(completeDelete, insertedDocumentsId, schema);

    return statistics;
  }

  async function createTable(schema) {
    return connection.query(getCreateTableSQLString(schema));
  }

  async function dropTable(schema) {
    return connection.query(`DROP TABLE ${schema.name}`);
  }

  async function completeInsert(schema) {
    const insertSql = `INSERT INTO ${schema.name} SET ?`;
    const values = schema.fields.reduce((res, {name, type}) => {
      res[name] = getRandom(type);
      return res;
    }, {});
    return connection.query(insertSql, values);
  }

  async function completeSelect(id, {name}) {
    let query = `SELECT * FROM ${name} WHERE id = '${id}'`;
    return connection.query(query);
  }

  async function completeDelete(id, {name}) {
    const query = `DELETE FROM ${name} WHERE id = ${id}`;
    return connection.query(query);
  }

  async function completeUpdate(id, {name, fields}) {
    let query = ` UPDATE ${name} SET `;
    fields.forEach(({name}, index) => {
      query += index === fields.length - 1 ? `${name} = ?` : `${name} = ?, `;
    });
    query += ` WHERE id = ?`;

    let values = [];
    fields.forEach(({type}) => {
      values.push([getRandom(type)]);
    });
    values.push(id);

    return connection.query(query, values);
  }

  function getCreateTableSQLString(schema) {
    let query = ` CREATE TABLE ${schema.name} (id INTEGER not NULL AUTO_INCREMENT, `;
    schema.fields.forEach((field) => {
      query = `${query}${getFieldSQLString(field)}`;
    });
    query = query + ' PRIMARY KEY ( id ))';
    return query;
  }

  /* TODO: DEFINE CONSTANTS!! */
  function getFieldSQLString(field) {
    const fieldType = field.type.toLowerCase() === 'string' ? 'VARCHAR(255)' : 'INTEGER not NULL';
    return `${field.name} ${fieldType}, `;
  }

  async function establishConnection() {
    return mysql.createConnection(config.mysql.url);
  }

  async function endConnection(connection) {
    return connection.end();
  }

  async function countOperationTimeMS(callOperation, ids, ...args) {
    const executionTime = [];
    for (let i = 0; i < EXPERIMENTS_NUMBER; i++) {
      const hrstart = process.hrtime();
      await callOperation(ids[i], ...args);
      const hrend = process.hrtime(hrstart);
      executionTime.push(hrend[1] / 1000000);
    }
    return executionTime.reduce((prev, curr) => prev + curr, 0) / EXPERIMENTS_NUMBER;
  }
};