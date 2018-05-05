import mongoose, {Schema} from 'mongoose';
import {isAllowed} from './helpers';
import {getRandom} from './query';

const DEFAULT_EXPERIMENTS_NUMBER = 10;

/* THINK ABOUT MORE SOPHISTICATED METHOD OF GETTING STATISTICS */
/* 1. INSERT SOME AMOUNT OF DOCUMENTS
 * 2. RANDOMLY GET DOCUMENTS IDS THAT SHOULD BE RETRIEVED / UPDATED / DELETED FROM COLLECTION */
/* for this moment I select/update/delete the same documents that were inserted */
export const processProjectMongo = async (schemas, configs) => {
  /*const schema = schemas[0];

  const Collection = await createCollection(schema.name);

  const experimentStatistics = await processOperationSeq(Collection, schema, configs);

  await deleteCollection(Collection);

  return experimentStatistics;*/

  return processOneToManySchemas(schemas, configs)
};

function recognizeRelations(schemas) {
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
  relations.primary = schemas.find(({name}) => name.toLowerCase() === primarySchemeName.toLowerCase());

  return relations
}

async function processOneToManySchemas(schemas, configs) {
  const {primary, foreign} = recognizeRelations(schemas);

  const {foreignIds, foreignCollection, foreignStatistics} =
    await processForeignScheme(foreign, configs[foreign._id]);

  const {primaryIds, primaryCollection, primaryStatistics} =
    await processPrimaryScheme(primary, foreign.name, foreignIds, configs[primary._id]);
}

async function processPrimaryScheme(schema, foreignSchemaName, foreignIds, config = {}) {
  const Collection = await createCollection(schema.name);

  let statistics = { create: 0, read: 0, update: 0, delete: 0 };

  const {loopCount, dataCount, create, read, update} = config
  const experimentsNumber = loopCount || DEFAULT_EXPERIMENTS_NUMBER;
  const initialDataNumber = dataCount || DEFAULT_EXPERIMENTS_NUMBER;

  const fillDocument = (fields) => ({...getRandomlyFilledDocument(fields), [`${foreignSchemaName}s`]: [foreignIds[0]]})

  const {insertedDocumentsId, executionTime} = await processDocumentsInsertion(
    Collection, schema, fillDocument , initialDataNumber);

  statistics.create = isAllowed(create) && executionTime.reduce((prev, curr) => prev + curr, 0) / initialDataNumber;

  statistics.read = isAllowed(read) &&
    (await countOperationTimeMS(readDocument, experimentsNumber, Collection, insertedDocumentsId));

  statistics.update = isAllowed(update) &&
    (await countOperationTimeMS(updateDocument, experimentsNumber, Collection, insertedDocumentsId, schema.fields));

  return {primaryStatistics: statistics, primaryCollection: Collection, primaryIds: insertedDocumentsId};
}

async function processForeignScheme(schema, config = {}) {
  const Collection = await createCollection(schema.name);

  let statistics = { create: 0, read: 0, update: 0, delete: 0 };

  const {loopCount, dataCount, create, read, update} = config
  const experimentsNumber = loopCount || DEFAULT_EXPERIMENTS_NUMBER;
  const initialDataNumber = dataCount || DEFAULT_EXPERIMENTS_NUMBER;

  const {insertedDocumentsId, executionTime} = await processDocumentsInsertion(
    Collection, schema, getRandomlyFilledDocument, initialDataNumber);

  statistics.create = isAllowed(create) && executionTime.reduce((prev, curr) => prev + curr, 0) / initialDataNumber;

  statistics.read = isAllowed(read) &&
    (await countOperationTimeMS(readDocument, experimentsNumber, Collection, insertedDocumentsId));

  statistics.update = isAllowed(update) &&
    (await countOperationTimeMS(updateDocument, experimentsNumber, Collection, insertedDocumentsId, schema.fields));

  return {foreignStatistics: statistics, foreignCollection: Collection, foreignIds: insertedDocumentsId};
}

async function processDocumentsInsertion(Collection, schema, fillDocument, initialDataNumber) {
  const insertedDocumentsId = [];
  const executionTime = [];

  for (let i = 0; i < initialDataNumber; i++) {
    const document = fillDocument(schema.fields);

    const hrstart = process.hrtime();
    const id = await insertDocument(Collection, document);
    const hrend = process.hrtime(hrstart);

    insertedDocumentsId.push(id);

    executionTime.push(hrend[1] / 1000000);
  }

  return {executionTime, insertedDocumentsId};
}

async function processOperationSeq(Collection, schema, configs) {
  let statistics = { create: 0, read: 0, update: 0, delete: 0 };

  const config = configs[schema._id] || {};
  const {loopCount, dataCount, create, read, update, remove} = config
  const experimentsNumber = loopCount || DEFAULT_EXPERIMENTS_NUMBER;
  const initialDataNumber = dataCount || DEFAULT_EXPERIMENTS_NUMBER;

  const {executionTime, insertedDocumentsId} = await processDocumentsInsertion(
    Collection, schema, getRandomlyFilledDocument, initialDataNumber);

  statistics.create = isAllowed(create) && executionTime.reduce((prev, curr) => prev + curr, 0) / initialDataNumber;

  statistics.read = isAllowed(read) &&
    (await countOperationTimeMS(readDocument, experimentsNumber, Collection, insertedDocumentsId));

  statistics.update = isAllowed(update) &&
    (await countOperationTimeMS(updateDocument, experimentsNumber, Collection, insertedDocumentsId, schema.fields));

  statistics.delete = isAllowed(remove) &&
    (await countOperationTimeMS(deleteDocument, experimentsNumber, Collection, insertedDocumentsId));

  return statistics;
}

// return insertedIds field
async function insertDocument(Collection, document) {
  const newDocument = Collection(document);
  await newDocument.save();
  return newDocument._id;
}

async function updateDocument(Collection, id, fields) {
  let document = await readDocument(Collection, id);
  fields.forEach(({name, type}) => {
    document[name] = getRandom(type);
  });
  await document.save();
}

async function readDocument(Collection, id) {
  return Collection.findOne({_id: id});
}

async function deleteDocument(Collection, id) {
  return Collection.deleteOne({_id: id});
}

async function deleteCollection(Collection) {
  await Collection.collection.drop();
}

function getRandomlyFilledDocument(fields) {
  const document = {};
  /* Simplifying */
  fields.forEach(({name, type}) => {
    document[name] = getRandom(type);
  });
  return document;
}

async function createCollection(collectionName) {
  if (!mongoose.models[collectionName]) {
    const collectionSchema = new Schema({}, {strict: false, collection: collectionName});
    return mongoose.model(collectionName, collectionSchema);
  } else {
    return mongoose.models[collectionName];
  }
}

async function countOperationTimeMS(callOperation, experimentsNumber, Collection, ids, ...args) {
  const executionTime = [];
  for (let i = 0; i < experimentsNumber; i++) {
    const hrstart = process.hrtime();
    await callOperation(Collection, ids[i], ...args);
    const hrend = process.hrtime(hrstart);
    executionTime.push(hrend[1] / 1000000);
  }
  return executionTime.reduce((prev, curr) => prev + curr, 0) / experimentsNumber;
}
