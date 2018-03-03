import {Types} from 'mongoose';

export const isObjectIdValid = (id) => Types.ObjectId.isValid(id);