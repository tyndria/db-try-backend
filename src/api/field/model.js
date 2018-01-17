import mongoose, { Schema } from 'mongoose';

// TODO: create schema Type and define the possible ones (String, Number, Ref... ?)
const FieldSchema = new Schema({
	name: String,
	type: String
});

const Field = mongoose.model('Field', FieldSchema);

export default Field;