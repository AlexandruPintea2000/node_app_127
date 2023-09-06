var mongoose = require('mongoose');

var Discussion = require('./discussion');

// message schema
var MessageSchema = mongoose.Schema({
  sender_id:{
    type:String
  },
  discussion_id: {
    type:String
  },
  text:{
    type:String
  },
});

MessageSchema.set('timestamps', true); // adds createdAt and updatedAt fields to the above schema containing timestamps 

// connect the scheme to the db model
var Message = module.exports = mongoose.model('Message', MessageSchema);

// creates a message
module.exports.createMessage = function(msg, callback){
  var newMessage = new Message(msg);
  newMessage.save();
  return newMessage;
}

// updates a message
module.exports.updateMessage = function(update, Message_id, callback){
  (async () => {
    await Message.findOneAndUpdate({_id: Message_id}, update);
  })()
}

// deletes a message
module.exports.deleteMessage = function(Message_id, callback){
  (async () => {
  await Message.findByIdAndRemove(Message_id);
  })()
}

// gets a message by id
module.exports.getMessageById = function(id, callback){
  Message.findById(id);
}

// gets all the messages that were eighter sent or recived by a user
module.exports.getUserMessages = async function(id, callback){
  m = await Message.find()

  rm = []
  for (i = 0; i < m.length; i = i + 1)
  {
    d = await Discussion.findById( m[i].discussion_id );

    if (!d.members.includes(m[i].sender_id))
      continue;

    rm.push( { id: m[i].id, sender_id: m[i].sender_id,  discussion_id: m[i].discussion_id, text: m[i].text, createdAt: m[i].createdAt, updatedAt: m[i].updatedAt } )
  }

  rm = JSON.stringify(rm); // return data ONLY as a string

  return rm;
}

// returns all the users
module.exports.getMessages = async function(callback){
  m = await Message.find()
  return JSON.stringify(m);
}

// returns all the users
module.exports.getMessagesFind = async function(callback){
  return await Message.find()
}

