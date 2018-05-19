import Logs from './model';
import {sendJson} from '../../utils/api';

export const create = async ({body}, res, next) => {
  return Logs(body)
    .save()
    .then(sendJson(res))
    .catch(next);
};

export const getAll = ({}, res, next) => {
  return Logs.find({})
    .then(sendJson(res))
    .catch(next);
};