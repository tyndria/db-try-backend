import mongoose, {Schema} from 'mongoose';
import {getRandom} from './query';

const DEFAULT_EXPERIMENTS_NUMBER = 10;

/* THINK ABOUT MORE SOPHISTICATED METHOD OF GETTING STATISTICS */
/* 1. INSERT SOME AMOUNT OF DOCUMENTS
 * 2. RANDOMLY GET DOCUMENTS IDS THAT SHOULD BE RETRIEVED / UPDATED / DELETED FROM COLLECTION */
/* for this moment I select/update/delete the same documents that were inserted */
export const processProjectMongo = async (schemas, configs) => {
  return processSchemas(schemas[0]);

  async function processSchemas(schema) {
    const Collection = await createCollection(schema.name);

    const experimentStatistics = await processOperationSeq(Collection, schema);

    await deleteCollection(Collection);

    return experimentStatistics;
  }

  async function processOperationSeq(Collection, schema) {
    let statistics = {
      create: 0,
      read: 0,
      update: 0,
      delete: 0
    };

    const config = configs[schema._id];
    const {loopCount, dataCount, create, read, update, remove} = config
    const EXPERIMENTS_NUMBER = loopCount || DEFAULT_EXPERIMENTS_NUMBER;

    const insertedDocumentsId = [];
    const executionTime = [];

    for (let i = 0; i < dataCount; i++) {
      const document = getRandomlyFilledDocument(schema.fields);

      const hrstart = process.hrtime();
      const id = await insertDocument(Collection, document);
      const hrend = process.hrtime(hrstart);

      insertedDocumentsId.push(id);

      executionTime.push(hrend[1] / 1000000);
    }

    statistics.create = create.allow && executionTime.reduce((prev, curr) => prev + curr, 0) / dataCount;

    statistics.read = read.allow &&
      (await countOperationTimeMS(readDocument, EXPERIMENTS_NUMBER, Collection, insertedDocumentsId));

    statistics.update = update.allow &&
      (await countOperationTimeMS(updateDocument, EXPERIMENTS_NUMBER, Collection, insertedDocumentsId, schema.fields));

    statistics.delete = remove.allow &&
      (await countOperationTimeMS(deleteDocument, EXPERIMENTS_NUMBER, Collection, insertedDocumentsId));

    return statistics;
  }

  async function createCollection(collectionName) {
    if (!mongoose.models[collectionName]) {
      const collectionSchema = new Schema({}, {strict: false, collection: collectionName});
      return mongoose.model(collectionName, collectionSchema);
    } else {
      return mongoose.models[collectionName];
    }
  }

  function getRandomlyFilledDocument(fields) {
    const document = {};
    /* Simplifying */
    fields.forEach(({name, type}) => {
      document[name] = getRandom(type);
    });
    return document;
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
};