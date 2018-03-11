import mongoose, {Schema} from 'mongoose';
import {getRandom} from './query';

const EXPERIMENTS_NUMBER = 10;

export const processProject = async (schemas) => {
  return processSchemas(schemas[0]);

  async function processSchemas(schema) {
    const Collection = await createCollection(schema.name);

    const experimentsStatistics = {
      create: 0,
      read: 0,
      update: 0,
      delete: 0
    };

    for (let i = 0; i < EXPERIMENTS_NUMBER; i ++) {
      const experimentStatistics = await processOperationSeq(Collection, schema);
      Object.keys(experimentsStatistics).forEach((key) => {
        experimentsStatistics[key] = experimentsStatistics[key] + experimentStatistics[key];
      })
    }

    await deleteCollection(Collection);

    return experimentsStatistics;
  }

  async function processOperationSeq(Collection, schema) {
    let statistics = {
      create: 0,
      read: 0,
      update: 0,
      delete: 0
    };

    const document = getRandomlyFilledDocument(schema.fields);

    const hrstart = process.hrtime();
    const id = await insertDocument(Collection, document);
    const hrend = process.hrtime(hrstart);
    statistics.create = hrend[1] / 1000000;

    statistics.read = await countOperationTimeMS(readDocument, Collection,  id);

    statistics.update = await countOperationTimeMS(updateDocument, Collection, id, schema.fields);

    statistics.delete = await countOperationTimeMS(deleteDocument, Collection, id);

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

  async function countOperationTimeMS(callOperation, ...args) {
    const hrstart = process.hrtime();
    await callOperation(...args);
    const hrend = process.hrtime(hrstart);
    return hrend[1] / 1000000;
  }
};