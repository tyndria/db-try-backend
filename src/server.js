import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import path from 'path';

import {passport} from 'auth';
import config from 'config';
import {sendJson} from 'utils/api';
import api from 'api';

export const publicPath = path.resolve(`${__dirname}/../`, config.publicPath);

const app = express();

app.use(express.static(publicPath));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session(config.session));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', api);

app.use((err, req, res, next) => {
	console.error(err.message);
	sendJson(res, err.status || 500)({error: err.message});
});

export default app;