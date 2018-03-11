import mongoose, {Schema} from 'mongoose';
import {getRandom} from './query';

const EXPERIMENTS_NUMBER = 10;

/* THINK ABOUT MORE SOPHISTICATED METHOD OF GETTING STATISTICS */
/* 1. INSERT SOME AMOUNT OF DOCUMENTS
 * 2. RANDOMLY GET DOCUMENTS IDS THAT SHOULD BE RETRIEVED / UPDATED / DELETED FROM COLLECTION */
/* for this moment I select/update/delete the same documents that were inserted */
export const processProject = async (schemas) => {
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

    const document = getRandomlyFilledDocument(schema.fields);
    const insertedDocumentsId = [];

    const executionTime = [];
    for (let i = 0; i < EXPERIMENTS_NUMBER; i++) {
      const hrstart = process.hrtime();

      const id = await insertDocument(Collection, document);
      insertedDocumentsId.push(id);

      const hrend = process.hrtime(hrstart);
      executionTime.push(hrend[1] / 1000000);
    }
    statistics.create = executionTime.reduce((prev, curr) => prev + curr, 0) / EXPERIMENTS_NUMBER;

    statistics.read = await countOperationTimeMS(readDocument, Collection, insertedDocumentsId);

    statistics.update = await countOperationTimeMS(updateDocument, Collection, insertedDocumentsId, schema.fields);

    statistics.delete = await countOperationTimeMS(deleteDocument, Collection, insertedDocumentsId);

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
    return await Collection.findOne({_id: id});
  }

  async function deleteDocument(Collection, id) {
    return Collection.deleteOne({_id: id});
  }

  async function deleteCollection(Collection) {
    await Collection.collection.drop();
  }

  async function countOperationTimeMS(callOperation, Collection, ids, ...args) {
    const executionTime = [];
    for (let i = 0; i < EXPERIMENTS_NUMBER; i++) {
      const hrstart = process.hrtime();
      await callOperation(Collection, ids[i], ...args);
      const hrend = process.hrtime(hrstart);
      executionTime.push(hrend[1] / 1000000);
    }
    return executionTime.reduce((prev, curr) => prev + curr, 0) / EXPERIMENTS_NUMBER;
  }
};