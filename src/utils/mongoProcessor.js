import mongoose, {Schema} from 'mongoose';
import isEmpty from 'lodash/isEmpty';
import {isAllowed, recognizeRelations, mergeStatistics} from './helpers';
import {getRandom, getRandomSample} from './query';

const DEFAULT_EXPERIMENTS_NUMBER = 10;

const getFieldNameFromCollName = field => `${field.toLowerCase()}s`;

/* THINK ABOUT MORE SOPHISTICATED METHOD OF GETTING STATISTICS */
/* 1. INSERT SOME AMOUNT OF DOCUMENTS
 * 2. RANDOMLY GET DOCUMENTS IDS THAT SHOULD BE RETRIEVED / UPDATED / DELETED FROM COLLECTION */
/* for this moment I select/update/delete the same documents that were inserted */
export const processProjectMongo = async (schemas, configs) => {
  const relations = recognizeRelations(schemas);
  if (!isEmpty(relations)) {
    return processOneToManySchemas(relations, configs)
  } else {
     return processSchemas(schemas, configs);
  }
};

async function processSchemas(schemas, configs) {
  const schema = schemas[0];
  const Collection = await createCollection(schema.name);
  const {statistics} = await processScheme(Collection, schema, getRandomlyFilledDocument, configs[schema._id]);
  await deleteCollection(Collection);
  return statistics;
}

async function processOneToManySchemas(schemas, configs) {
  const statistics = { populate: 0 };

  const {primary, foreign} = schemas;

  const foreignConfig = configs[foreign._id] || {}
  const primaryConfig = configs[primary._id] || {};
  const experimentsNumber = foreignConfig.loopCount || primaryConfig.loopCount || DEFAULT_EXPERIMENTS_NUMBER;

  const foreignCollection = await createCollection(foreign.name);
  const primaryCollection = await createCollection(primary.name);

  const {insertedDocumentsId: foreignIds, statistics: foreignStatistics} =
    await processScheme(foreignCollection, foreign, getRandomlyFilledDocument, foreignConfig, false);

  const fillPrimaryDocument = (fields) =>
    ({...getRandomlyFilledDocument(fields), [getFieldNameFromCollName(foreign.name)]: [getRandomSample(foreignIds)]})

  const {insertedDocumentsId: primaryIds, statistics: primaryStatistics} =
    await processScheme(primaryCollection, primary, fillPrimaryDocument, primaryConfig, false);

  const path = getFieldNameFromCollName(foreign.name);
  statistics.populate = isAllowed(primaryConfig.populate) &&
    (await countOperationTimeMS(populateDocument, experimentsNumber, primaryCollection, primaryIds, path, foreign.name));

  foreignStatistics.delete = isAllowed(foreignConfig.remove) &&
    (await countOperationTimeMS(deleteDocument, experimentsNumber, foreignCollection, foreignIds));

  primaryStatistics.delete = isAllowed(primaryConfig.remove) &&
    (await countOperationTimeMS(deleteDocument, experimentsNumber, primaryCollection, primaryIds));

  await deleteCollection(foreignCollection);
  await deleteCollection(primaryCollection);

  return mergeStatistics(statistics, ['create', 'read', 'update', 'delete'], foreignStatistics, primaryStatistics);
}

async function processScheme(Collection, schema, fillDocument, config = {}, doesDelete = true) {
  let statistics = { create: 0, read: 0, update: 0, delete: 0 };

  const {loopCount, dataCount, create, read, update, remove} = config
  const experimentsNumber = loopCount || DEFAULT_EXPERIMENTS_NUMBER;
  const initialDataNumber = dataCount || DEFAULT_EXPERIMENTS_NUMBER;

  const {executionTime, insertedDocumentsId} = await processDocumentsInsertion(
    Collection, schema, fillDocument, initialDataNumber);

  statistics.create = isAllowed(create) && executionTime.reduce((prev, curr) => prev + curr, 0) / initialDataNumber;

  statistics.read = isAllowed(read) &&
    (await countOperationTimeMS(readDocument, experimentsNumber, Collection, insertedDocumentsId));

  statistics.update = isAllowed(update) &&
    (await countOperationTimeMS(updateDocument, experimentsNumber, Collection, insertedDocumentsId, schema.fields));

  if (doesDelete) {
    statistics.delete = isAllowed(remove) &&
      (await countOperationTimeMS(deleteDocument, experimentsNumber, Collection, insertedDocumentsId));
  }

  return {statistics, insertedDocumentsId};
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

async function populateDocument(Collection, id, path, model) {
  return Collection
    .findOne({_id: id})
    .populate({path, model});
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
