import mongoose, { Schema } from 'mongoose';
import config from 'config';
import { genSalt, hash, compare } from 'bcrypt';
import pick from 'lodash/pick';

const UserSchema = new Schema((
  firstName: String,
  lastName: String,
  email: {
    type: String,
    unique: true,
    required: true,
  },
  passwordHash: String,
  permissions: Schema.Types.Mixed,
  role: {
    type: String,
    enum: ['client', 'developer', 'lead'],
    required: true,
    default: 'client',
  },
));

UserSchema.virtual('name').get(function get() {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('password').get(function get() {
  return this.passwordHash;
});

UserSchema.methods.setPassword = async function set(password) {
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

export const serializeUser = object => pick(object, [...fieldsToSerialize, 'permissions']);

export const checkPermissions = (user, list) => user && list.every(perm => user.permissions[perm]);

export default User;