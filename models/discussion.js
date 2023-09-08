var mongoose = require('mongoose');

// discussion schema
var DiscussionSchema = mongoose.Schema({
  name: { type: String },
  members: { type: String },
  banned_users: { type: String }
});

// connect the scheme to the db model
var Discussion = module.exports = mongoose.model('Discussion', DiscussionSchema);

// importing other required models
var Message = require('./message');



// converts the strings that contain the member ids into an arrays of ids
function reformat_discussions (discussions)
{
  for (i = 0; i < discussions.length; i = i + 1)
  {
    var m = discussions[i].members.split(',');
    members = [];
    for (j = 0; j < m.length; j = j + 1)
      members.push(m[j]);
    discussions[i].members = members;

    var bu = discussions[i].banned_users.split(',');
    banned_users = [];
    for (j = 0; j < bu.length; j = j + 1)
      banned_users.push(bu[j]);
    discussions[i].banned_users = banned_users;
  }
  return discussions;
}

// returns all discussions
module.exports.getDiscussions = async function(id, callback){
  var d = await Discussion.find();

  // console.log(d);

  discussions = [];

  for (i = 0; i < d.length; i = i + 1)
  {
    discussions.push({});
    discussions[i].id = d[i]._id;
    discussions[i].name = d[i].name;
    var m = d[i].members.split(',');
    members = [];
    for (j = 0; j < m.length; j = j + 1)
      members.push(m[j]);
    discussions[i].members = members;

    var bu = d[i].banned_users.split(',');
    banned_users = [];
    for (j = 0; j < bu.length; j = j + 1)
      banned_users.push(bu[j]);
    discussions[i].banned_users = banned_users;
  }

  // d = reformat_discussions(d);

  // console.log(d);

  return JSON.stringify(d); // send data ONLY as string
}

// get all the discussions that a user is a member of
module.exports.getDiscussionsByUserId = async function(id, callback){
  var d = await Discussion.find();

  var discussions = [];

  for (i = 0; i < d.length; i = i + 1)
  {
    members = d[i].members.split( ',' );

    if (members.includes(id))
      discussions.push(d[i]);
  }

  discussions = reformat_discussions(discussions);

  return JSON.stringify(discussions); // send data ONLY as string
}

// create a discussion
module.exports.createDiscussion = function(discussion, callback){
  var newDiscussion = new Discussion(discussion);
  newDiscussion.save();
} 

// update the discussion
module.exports.updateDiscussion = function(update, discussion_id, callback){
  (async () => {
    await Discussion.findOneAndUpdate({_id: discussion_id}, update);
  })()
}

// delete a discussion
module.exports.deleteDiscussion = async function(id){
  await Discussion.findOneAndRemove(id);
  await Message.deleteMany({ discussion_id: id });  
}

// verifies if the discussion title is already in the db
module.exports.haveDiscussionAlready = async function(text, callback)
{
  var d = await Discussion.find();

  for ( i = 0; i < d.length; i = i + 1 )
  {
    if ( d[i].name == text )
      return d[i].id;
  }

  return -1;
}

