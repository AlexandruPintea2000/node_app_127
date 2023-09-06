var mongoose = require('mongoose');


// assignment schema
var AssignmentSchema = mongoose.Schema({
  name: { type: String },
  // discussion_id: { type: String }, // optional
  description: { type: String },
  users_assigned: { type: String }, // ids
  status: { type: String }, // -2 = notAttempted/ -1 = inProgress/ 0 = done
  topics: { type: String }, // ids
  end_date: { type: String }, // yyyy-mm-dd
  discussion_ids: { type: String } // comma-separated discussion ids
});

// topic schema
var TopicSchema = mongoose.Schema({
  name: { type: String }, // the project name of that assignments belong to
});

// connect the scheme to the db model
var Assignment = module.exports = mongoose.model('Assignment', AssignmentSchema);

// connect the scheme to the db model
var Topic = module.exports = mongoose.model('Topic', TopicSchema);

// converts the string that contains the member ids into an array of them
function reformat_assignments (assignments)
{
  for (i = 0; i < assignments.length; i = i + 1)
  {
    var m = assignments[i].members.split(',');
    members = [];
    for (j = 0; j < m.length; j = j + 1)
      members.push(m[j]);
    // delete assignments[i].members;
    assignments[i].members = members;
  }
  return assignments;
}

// returns all assignments - I DONT THINK I USE THIS - outdated
module.exports.getAssignments = async function(id, callback){
  var d = await Assignment.find();

  assignments = [];

  for (i = 0; i < d.length; i = i + 1)
  {
    assignments.push({});
    assignments[i].id = d[i]._id;
    assignments[i].name = d[i].name;
    var m = d[i].members.split(',');
    members = [];
    for (j = 0; j < m.length; j = j + 1)
      members.push(m[j]);
    assignments[i].members = members;
  }

  return JSON.stringify(assignments); // send data ONLY as string
}

// get all the assignments that a user is a member of
module.exports.getAssignmentsByUserId = async function(id, callback){
  var d = await Assignment.find();

  var assignments = [];

  for (i = 0; i < d.length; i = i + 1)
  {
    members = d[i].members.split( ',' );

    if (members.includes(id))
      assignments.push(d[i]);
  }

  assignments = reformat_assignments(assignments);

  return JSON.stringify(assignments); // send data ONLY as string
}

// create a assignment
module.exports.createAssignment = async function(assignment, callback){
  var newAssignment = new Assignment(assignment);
  return await newAssignment.save();
}

// create a topic
module.exports.createTopic = async function(topic){
  var newTopic = new Topic(topic);
  return await newTopic.save();
}

// update a topic
module.exports.updateTopic = async function(update, id){
  await Topic.findOneAndUpdate({_id: id}, update);
}

// update a assignment
module.exports.updateAssignment = async function(update, id){
  await Assignment.findOneAndUpdate({_id: id}, update);
}

// get all topics
module.exports.findTopics = async function(){
  return await Topic.find();
}

// get all assignments
module.exports.findAssignments = async function(){
  return await Assignment.find();
}

// get topic by id
module.exports.findTopicById = async function(id){
  return await Topic.findById(id);
}

// get assignment by id
module.exports.findAssignmentById = async function(id){
  return await Assignment.findById(id);
}


// delete a topic
module.exports.deleteTopic = async function(id){
  await Topic.findByIdAndRemove(id);

  a = await Assignment.find();

  // here, the topic id of the deleted topic is deleted from all the assignments present in the db
  for ( i = 0; i < a.length; i = i + 1 )
    if ( a[i].topics.includes(id) )
    {
      t = a[i].topics.split(',');
      new_t = "";
      for ( j = 0; j < t.length; j = j + 1 )
      {
        if ( t[j] != id )
          new_t = new_t + t[j];

        if ( j != t.length - 1 )
          new_t = new_t + ',';
      }

      if ( new_t[new_t.length - 1] == ',' )
        new_t = new_t.slice(0, -1);

      update = { topics: new_t }

      await Assignment.findOneAndUpdate({_id: a[i].id}, update);
    }
}

// delete a assignment
module.exports.deleteAssignment = async function(id){
  await Assignment.findByIdAndRemove(id);
}


// verifies if the topic title is already in the db
module.exports.haveTopicAlready = async function(text_topic, callback)
{

  var t = await Topic.find();

  console.log(t);

  for ( i = 0; i < t.length; i = i + 1 )
  {
    if ( t[i].name == text_topic )
      return t[i].id;
    console.log(t[i].name + " is not " + text_topic)
  }

  return -1;

}

// verifies if the assignment title is already in the db
module.exports.haveAssignmentAlready = async function(text_assignment, callback)
{

  var a = await Assignment.find();

  for ( i = 0; i < a.length; i = i + 1 )
  {
    if ( a[i].name == text_assignment )
      return a[i].id;
  }

  return -1;

}


