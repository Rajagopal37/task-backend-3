const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  assignDate: { type: Date, required: true },
  lastDate: { type: Date, required: true },
  userId: { type: String, required: true },
  status: { type: String,default: 'Incomplete' },
  createdOn:{type:Date, default: new Date().getTime()},
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
});

module.exports = mongoose.model('Task', taskSchema);