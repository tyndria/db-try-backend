import mongoose from 'mongoose';
import session from 'express-session';
import connectMongo from 'connect-mongo';

import defaultConfig from './config.json';

const MongoStore = connectMongo(session);

const config = defaultConfig;
config.port = process.env.PORT || config.port;

config.mongodb.url = process.env.MONGODB_URI;
config.mysql.url = process.env.CLEARDB_DATABASE_URL;

config.session.store = new MongoStore({ mongooseConnection: mongoose.connection });

export default config;
