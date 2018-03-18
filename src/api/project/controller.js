import Project, {serializeProject} from './model';
import Scheme from '../scheme/model';
import {sendJson} from '../../utils/api';
import {processProjectMongo} from '../../utils/mongoProcessor';
import {processProjectMySQL} from '../../utils/mysqlProcessor';

export const getAll = (req, res, next) => {
  return Project.find()
    .populate('schemas')
    .then(projects => projects.map(serializeProject))
    .then(sendJson(res))
    .catch(next);
};

export const create = async ({body}, res, next) => {
  return Project(body)
    .save()
    .then(serializeProject)
    .then(sendJson(res))
    .catch(next);
};

/* It's run only mongodb */
export const run = async ({params}, res, next) => {
  const projectId = params.projectId;
  return Scheme.find({projectId})
    .populate('fields')
    .then(processProject)
    .then(sendJson(res))
    .catch(next);
};

const processProject = async (schemas) => {
  const mongo = await processProjectMongo(schemas);
  const mysql = await processProjectMySQL(schemas);
  return {mongo, mysql};
};
