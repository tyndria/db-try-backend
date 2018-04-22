import mongoose, {Schema} from 'mongoose';

import config from 'config';
import roles from '../../constants/permissions';
import {genSalt, hash, compare} from 'bcrypt';
import pick from 'lodash/pick';

const UserSchema = new Schema({
	firstName: String,
	lastName: String,
	email: {
		type: String,
		unique: true,
		required: true,
	},
	passwordHash: String,
	role: {
		type: String,
		enum: ['client', 'developer', 'lead'],
		required: true,
		default: 'client',
	},
});

UserSchema.virtual('name').get(function get () {
	return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('password').get(function get () {
	return this.passwordHash;
});

UserSchema.virtual('permissions').get(function get () {
	return roles[this.role];
});

UserSchema.methods.setPassword = async function set (password) {
	this.passwordHash = await this.generateHash(password);
};

UserSchema.methods.generateHash = async (password) => {
	const salt = await genSalt(config.auth.saltRounds);
	return hash(password, salt);
};

UserSchema.methods.authenticate = async function authenticate(password) {
	return compare(password, this.passwordHash);
};

const User = mongoose.model('User', UserSchema);

const fieldsToSerialize = ['firstName', 'lastName', 'email', 'role'];

// https://github.com/lodash/lodash/blob/master/pick.js
export const serializeUser = object => pick(object, [...fieldsToSerialize, 'permissions', '_id']);

export const checkPermissions = (user, list) => user && list.every(perm => user.permissions.includes(perm));

export default User;