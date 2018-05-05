import Project, {serializeProject} from './model';
import Scheme from '../scheme/model';
import {sendJson} from '../../utils/api';
import {processProjectMongo} from '../../utils/mongoProcessor';
import {processProjectMySQL} from '../../utils/mysqlProcessor';

export const getAll = ({params: {userId}}, res, next) => {
  return Project.find({user: userId})
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
export const run = async ({params, body}, res, next) => {
  const projectId = params.projectId;
  return Scheme.find({projectId})
    .populate('fields')
    .then(schemas => processProject(schemas, body))
    .then(sendJson(res))
    .catch(next);
};

const statistics = ['create', 'update', 'read', 'delete', 'populate'];

const processProject = async (schemas, config) => {
  const mongoStat = await processProjectMongo(schemas, config);
  const mysqlStat = await processProjectMySQL(schemas, config);
  return statistics.map((operation) => {
    return {operation, mongodb: mongoStat[operation], mysql: mysqlStat[operation]};
  });
};
