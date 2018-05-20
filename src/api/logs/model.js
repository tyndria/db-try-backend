import mongoose, { Schema } from 'mongoose';

const LogsSchema = new Schema({
  coll: String,
  method: String,
  query: String,
  doc: String,
  timestamp: { type: Date, default: Date.now },
});

const Logs = mongoose.model('Logs', LogsSchema);

export default Logs;