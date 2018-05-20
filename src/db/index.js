import mongoose from 'mongoose';
import config from 'config';

import {Logs} from 'api/logs';

export default (silent = false) => {
	const { mongodb: { url, options } } = config;
	mongoose.Promise = global.Promise;

  mongoose.set('debug', (coll, method, query = '', doc = '') => {
  	// FIXME: hard
  	if (coll !== 'logs') {
      Logs({coll, method, query: JSON.stringify(query), doc: JSON.stringify(doc)}).save()
		}
  });

	mongoose.connection.on(
		'connected',
		() => (silent ? null : console.log(`Mongoose: connected to ${url}`))
	);
	mongoose.connection.on('error', err => console.error(`Mongoose: connection error: ${err}`));
	mongoose.connection.on(
		'disconnected',
		() => (silent ? null : console.log('Mongoose: disconnected'))
	);
	return mongoose.connect(url, options, () => {});
};