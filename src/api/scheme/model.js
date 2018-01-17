import mongoose, { Schema } from 'mongoose';

const SchemeSchema = new Schema({
	name: String,
	projectId: {
		type: Schema.Types.ObjectId,
		ref: 'Project'
	},
	fields: [{
		type: Schema.Types.ObjectId,
		ref: 'Field'
	}]
});

const Scheme = mongoose.model('Scheme', SchemeSchema);

export default Scheme;