import { createServer } from 'http';
import path from 'path';
import config from 'config';
import app, { publicPath } from 'server';
import connectDb from 'db';

connectDb();

app.get('*', (req, res) => {
	res.sendFile(path.join(publicPath, 'index.html'));
});

app.post('*', (req, res) => {
	const headers = {};

  headers['Access-Control-Allow-Credentials'] = 'true';
	headers['Access-Control-Allow-Headers'] = 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With';
	res.writeHead(200, headers);

	res.end();
});

createServer(app).listen(config.port, () => {
	console.log(`Server running at http://localhost:${config.port}`);
});