import config from 'config';
import mysql from 'mysql2/promise';
import {getRandom} from './query';

export const processProjectMySQL = async (schemas) => {
  const connection = await establishConnection();

  for (let i = 0; i < schemas.length; i++) {
    await processSchemas(schemas[i]);
  }

  await endConnection(connection);

  async function processSchemas(schema) {
    await createTable(schema);
    
    const insertedObject = await completeInsert(schema);

    const selectedObjects = await completeSelect(schema, insertedObject.values);

    await dropTable(schema);
  }

  async function createTable(schema) {
    return connection.query(getCreateTableSQLString(schema));
  }

  async function dropTable(schema) {
    return connection.query(`DROP TABLE ${schema.name}`);
  }

  async function completeInsert(schema) {
    const insertSql = getInsertSQLString(schema);
    const values = schema.fields.reduce((res, {name, type}) => {
      res[name] = getRandom(type);
      return res;
    }, {});
    return connection.query(insertSql, values);
  }

  async function completeSelect({name}, insertedValues) {
    const keyToSearch = Object.keys(insertedValues)[0]; // use the first key just to simplify
    //let query = `SELECT * FROM ${name} WHERE ${keyToSearch} = '${insertedValues[keyToSearch]}'`;
    let query = `SELECT * FROM ${name};`;
    return connection.query(query);
  }

  function getInsertSQLString({name}) {
    return `INSERT INTO ${name} SET ?`;
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
    const connection = mysql.createConnection(config.mysql.url);
    return connection;
  }

  async function endConnection(connection) {
    return connection.end();
  }
};