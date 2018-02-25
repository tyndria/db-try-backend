import { BadRequestError } from 'utils/api';
import isEmpty from 'lodash/isEmpty';

export const requireFields = (...fields) => (req, res, next) => {
  const errors = {};

  fields.forEach(field => {
    if (!req.body[field]) {
      errors[field] = `The field ${field} is required`;
    }
  });

  if (!isEmpty(errors)) {
    return next(new BadRequestError(errors));
  }
  return next();
};

