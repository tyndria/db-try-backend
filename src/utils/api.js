import HttpError from 'node-http-error';

export const sendJson = (res, status = 200) => data => res.status(status).json(data);

export const BadRequestError = message => HttpError(400, message);