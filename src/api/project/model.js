import mongoose, { Schema } from 'mongoose';

const ProjectSchema = new Schema({
	name: String,
	user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
	},
	schemas: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Scheme',
		}
	]
});

const Project = mongoose.model('Project', ProjectSchema);

export const serializeProject = project => ({
	name: project.name,
	id: project._id
});

export default Project;