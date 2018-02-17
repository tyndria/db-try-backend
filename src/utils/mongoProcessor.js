import mongoose, {Schema} from 'mongoose';
import crypto from 'crypto';

export const processProject = async (schemas) => {
  for (let i = 0; i < schemas.length; i++) {
    await processSchemas(schemas[i]);
  }

  async function processSchemas(schema) {
    const Collection = await createCollection(schema.name);

    const document = getRandomlyFilledDocument(schema.fields);

    const id = await insertDocument(Collection, {document});

    const readedDocument = await readDocument(Collection, {id});

    await deleteDocument(Collection, {id});

    await deleteColletion(Collection);
  }

  async function createCollection(collectionName) {
    const collectionSchema = new Schema({}, {strict: false, collection: collectionName});
    return mongoose.model(collectionName, collectionSchema);
  }

  function getRandomlyFilledDocument(fields) {
    const document = {};
    /* Simplifying */
    fields.forEach(({name, type}) => {
      document[name] = type.toLowerCase() === 'string' ? getRandomString() : getRandomNumber();
    });
    return document;
  }

  // return insertedIds field
  async function insertDocument(Collection, {document}) {
    const newDocument = Collection(document);
    await newDocument.save();
    return newDocument._id;
  }

  async function readDocument(Collection, {id}) {
    return await Collection.findOne({_id: id});
  }

  async function deleteDocument(Collection, {id}) {
    return Collection.deleteOne({_id: id});
  }

  async function deleteColletion(Collection) {
    await Collection.collection.drop();
  }

  function getRandomString() {
    return crypto.randomBytes(64).toString('hex');
  }

  function getRandomNumber() {
    return Math.random();
  }

  const EXPERIMENTS_NUMBER = 10;

  async function countOperationTimeMS(collection, callOperation,  ...args) {
    const executionTime = [];
    for (let i = 0; i < EXPERIMENTS_NUMBER; i ++) {
      const hrstart = process.hrtime();
      await callOperation(collection, args);
      const hrend = process.hrtime(hrstart);
      executionTime.push(hrend[1]/1000000);
    }
    return executionTime.reduce((prev, curr) => prev + curr, 0) / EXPERIMENTS_NUMBER;
  }
};