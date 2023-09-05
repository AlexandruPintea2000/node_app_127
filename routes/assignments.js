var express= require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcryptjs');
const session = require('express-session')

// importing required models
var Message = require('../models/message');
var Discussion = require('../models/discussion');
var User = require('../models/user');
var Assignment = require('../models/assignment');
// the topic class is justified since the only alternative to it is going though all the assignments and retriving all the topic from their JSON "topics" parameter, which takes way more computation


// page used to create a assignment
router.get('/create_assignment:a', User.ensureModerator, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (!User.ensureAuthenticated)
  {
    res.redirect('/users/login');
    return;
  }

  (async () => {
    id = req.params.a.slice(1); // remove the : from the baginning of the GET request message

    u = await User.find(); // selects all users from the database, so as to let the logged in user include them in a newly created assignment

    users = []

    for (i = 0; i < u.length; i = i + 1) // object relational mapping as it were
    {
      users.push({});
      users[i].id = u[i].id;
      users[i].username = u[i].username;
      users[i].name = u[i].firstname + ' ' + u[i].lastname;
    }

    users = JSON.stringify(users); // ONLY send data to the frontend as strings



    t = await Assignment.findTopics(); // selects all topics from the database, so as to let the logged in topic include them in a newly created assignment

    topics = []

    for (i = 0; i < t.length; i = i + 1) // object relational mapping as it were
    {
      topics.push({});
      topics[i].id = t[i].id;
      topics[i].name = t[i].name;
    }

    topics = JSON.stringify(topics); // ONLY send data to the frontend as strings




    a = await Assignment.findAssignments(); // selects all assignments from the database

    assignments = []

    for (i = 0; i < a.length; i = i + 1) // object relational mapping as it were
    {
      assignments.push({});
      assignments[i].id = a[i].id;
      assignments[i].name = a[i].name;
      assignments[i].description = a[i].description;
      assignments[i].users_assigned = a[i].users_assigned;
      assignments[i].status = a[i].status;
      assignments[i].topics = a[i].topics;
      assignments[i].end_date = a[i].end_date;
      assignments[i].discussion_ids = a[i].discussion_ids;
    }

    assignments = JSON.stringify(assignments); // ONLY send data to the frontend as strings

    console.log(assignments);



    d = await Discussion.find(); // selects all discussions from the database

    discussions = []

    for (i = 0; i < d.length; i = i + 1) // object relational mapping as it were
    {
      discussions.push({});
      discussions[i].id = d[i].id;
      discussions[i].name = d[i].name;
      discussions[i].members = d[i].members;
      discussions[i].banned_users = d[i].banned_users;
    }

    discussions = JSON.stringify(discussions); // ONLY send data to the frontend as strings

    console.log(discussions);


    res.render('create_assignment', {user_id: req.session.user_id, user: req.session.user, users: users, topics: topics, assignments: assignments, discussions: discussions, id: id });
  })()

});



// user creates/edits a assignment
router.post('/create_assignment', User.ensureModerator, function(req,res){
var id = req.body.id;
edit = false; // decide if the user wants to edit or create and assignment (since the same form is used)
if (id != "")
  edit = true;

// convert POST fields into JS variables
var title = req.body.title;
var text_topic = String(req.body.text_topic);
var select_topic_ids = req.body.topic_ids; // the input tyle='text' with the topic ids separated by comma
var details = req.body.description;
details = details.replace(/\r\n/g, "<br/>");
var user_ids = req.body.ids;
var end_date = String(req.body.end_date).substring(0, 10)
var discussion_ids = req.body.discussion_ids;

console.log("discussion_ids");
console.log(discussion_ids);

//validation
req.checkBody('title', 'Title is required').notEmpty();
req.checkBody('details', 'Details are required').notEmpty();
(async () => {

// change from 'create assignment' to 'edit assignment' if the title is pre-existent - assuming that was the user's intention
id = await Assignment.haveAssignmentAlready(title);
if ( id != -1 )
  edit = true;

var topic_id = "";

// add the topics from the select to the ones that were entered
// if ( select_topic_ids.includes(',') )
// {
//   select_topics = select_topic_ids.split(',');

//   for ( var i = 0; i < select_topics.length; i = i + 1 )
//   {
//     topic_id = topic_id + select_topics[i];

//     if ( i != select_topics.length - 1 )
//       topic_id = topic_id + ',';
//   }
// }
// else
// {
//   if ( select_topic_ids != "" )

// trimming for unwanted ','
if ( select_topic_ids[0] == ',' )
  select_topic_ids = select_topic_ids.slice(1);
if ( select_topic_ids[select_topic_ids.length - 1] == ',' )
  select_topic_ids = select_topic_ids.slice(0, -1)


topic_id = select_topic_ids;
// }


// check if multiple topics were entered
if (text_topic.includes(','))
{
  topics = text_topic.split(',');

  // check each topic to see if its in the db already, if not add it, while converting the topics array into a comma-separated topic id string
  for ( var i = 0; i < topics.length; i = i + 1 )
  {
    if (topics[i] == "")
      continue;

    t = await Assignment.haveTopicAlready(topics[i]);
    if (t != -1)
    {
      if ( !topic_id.includes( t ) )
        topic_id = topic_id + ',' + t;
    }
    else
    {
      // if the topic entered was not found in the db, it shall be added to it
      new_a = await Assignment.createTopic({name: topics[i]});
      topic_id = topic_id + ',' + new_a.id;
    }

  }

  // trimming for unwanted ','
  if ( topic_id[0] == ',' )
    topic_id = topic_id.slice(1);
  if ( topic_id[topic_id.length - 1] == ',' )
    topic_id = topic_id.slice(0, -1)

  a = { name: title, description: details, status: "notAttempted", topics: topic_id, users_assigned: user_ids, end_date: end_date, discussion_ids: discussion_ids };

  if (edit)
    await Assignment.updateAssignment( a, id );
  else
    await Assignment.createAssignment( a );
}
else
{
  if (text_topic != "") // if the user did not enter a topic in text
  {
    // check if the entered topic is already present in the db
    t = await Assignment.haveTopicAlready(text_topic);
    if (t != -1)
      topic_id = topic_id + ',' + t
    else
    {
      new_a = await Assignment.createTopic({name: text_topic});
      console.log("LOOK HERE FOR new_a");
      console.log(new_a);
      topic_id = topic_id + ','  + new_a.id;
      console.log(topic_id);
    }

    // // check if the entered topic was not chosen in the select too
    // if ( select_topic_ids != "" )
    // {
    //   if ( !select_topic_ids.includes(topic_id) )
    //     topic_id = topic_id + ',' + select_topic_ids;
    //   else
    //     topic_id = topic_id + select_topic_ids;
    // }

    // trimming for unwanted ','
    if ( topic_id[0] == ',' )
      topic_id = topic_id.slice(1);
    if ( topic_id[topic_id.length - 1] == ',' )
      topic_id = topic_id.slice(0, -1)

    a = { name: title, description: details, status: "notAttempted", topics: topic_id, users_assigned: user_ids, end_date: end_date, discussion_ids: discussion_ids };

    if (edit)
      await Assignment.updateAssignment( a, id );
    else
      await Assignment.createAssignment( a );
  }
  else // if only dropdown topics were selected
  { 
    // trimming for unwanted ','
    if ( select_topic_ids[0] == ',' )
      select_topic_ids = select_topic_ids.slice(1);
    if ( select_topic_ids[select_topic_ids.length - 1] == ',' )
      select_topic_ids = select_topic_ids.slice(0, -1)

    a = { name: title, description: details, status: "notAttempted", topics: select_topic_ids, users_assigned: user_ids, end_date: end_date, discussion_ids: discussion_ids };

    if (edit)
      await Assignment.updateAssignment( a, id );
    else
      await Assignment.createAssignment( a );
  }
}

  res.redirect( "/assignments/create_assignment:" ); // return to the page where the user was before, where the new assignment can be viewed
})()

});



// create a topic
router.post('/create_topic', User.ensureModerator, function(req,res){
  if (req.session.user == undefined) // check for the user to be authenticated
    res.redirect('/users/login');

  (async () => {
    var title = req.body.title;

    t = await Assignment.haveTopicAlready(title);
    
    if (t == -1) // if the topic is not in the db, add it
      Assignment.createTopic({name: title});

    res.redirect( "/assignments/create_assignment:" );
  })()
});





// edit a topic
router.post('/edit_topic', User.ensureModerator, function(req,res){
  if (req.session.user == undefined) // check for the used to be authenticated
    res.redirect('/users/login');

  (async () => {

    var update = {
      name: req.body.title
    }

    //validation
    req.checkBody('title', 'Title is required').notEmpty();

    t = await Assignment.updateTopic(update, req.body.edit_topic_id);

    res.redirect( "/assignments/create_assignment:" );
  })()

});

// delete a topic
router.post('/delete_topic', User.ensureModerator, function(req,res){
  if (req.session.user == undefined) // check for the used to be authenticated
    res.redirect('/users/login');
  else
  {
    (async () => {
    await Assignment.deleteTopic(req.body.delete_topic_id);
    res.redirect('/assignments/create_assignment:');
    })()
  }
});

// delete an assignment
router.post('/delete_assignment', User.ensureModerator, function(req,res){
  if (req.session.user == undefined) // check for the used to be authenticated
    res.redirect('/users/login');
  else
  {
    (async () => {
    await Assignment.deleteAssignment(req.body.delete_assignment_id);
    res.redirect('/assignments/create_assignment:');
    })()
  }
});



// page used to view user assignments (for any user, by using their id sent though GET)
router.get('/view_assignments:a', User.ensureAuthenticated, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (!User.ensureAuthenticated)
  {
    res.redirect('/users/login');
    return;
  }

  (async () => {
    id = req.params.a.slice(1);
    if ( String(id) == "" ) // if no id is specified, that means the user trying to view their assignments is the one that is signed in
      id = req.session.user_id;
 
    user_of_assignments = "" // the user that wants to view their assignments;
    if ( id != "all" ) // the identificator "all" is used for when an admin wants to view absolutely ball the assignments
    {
      user_of_assignments = await User.findById(id);

      user_of_assignments = JSON.stringify(user_of_assignments);
    }
    u = await User.find(); // selects all users from the database, so as to let the logged in user include them in a newly created assignment

    users = []

    for (i = 0; i < u.length; i = i + 1) // object relational mapping as it were
    {
      users.push({});
      users[i].id = u[i].id;
      users[i].username = u[i].username;
      users[i].name = u[i].firstname + ' ' + u[i].lastname;
    }

    // users = JSON.stringify(users); // ONLY send data to the frontend as strings



    t = await Assignment.findTopics(); // selects all topics from the database, so as to let the logged in topic include them in a newly created assignment

    topics = []

    for (i = 0; i < t.length; i = i + 1) // object relational mapping as it were
    {
      topics.push({});
      topics[i].id = t[i].id;
      topics[i].name = t[i].name;
    }

    // topics = JSON.stringify(topics); // ONLY send data to the frontend as strings



    d = await Discussion.find(); // selects all discussions from the database

    discussions = []

    for (i = 0; i < d.length; i = i + 1) // object relational mapping as it were
    {
      discussions.push({});
      discussions[i].id = d[i].id;
      discussions[i].name = d[i].name;
      discussions[i].members = d[i].members;
      discussions[i].banned_users = d[i].banned_users;
    }

    // discussions = JSON.stringify(discussions); // ONLY send data to the frontend as strings

    console.log(discussions);

    // selects all user assignments
    a = await Assignment.findAssignments();

    if ( id != "all" )
    {
      user_a = [];

      for ( i = 0; i < a.length; i = i + 1 )
        if ( a[i].users_assigned.includes(id) )
          user_a.push(a[i]);

      assignments = user_a;
    }
    else
      assignments = a;

    a = [];
    for ( i = 0; i < assignments.length; i = i + 1)
    {
      a.push({});
      a[i].id = assignments[i].id;
      a[i].name = assignments[i].name;
      a[i].discussion_id = assignments[i].discussion_id;
      a[i].status = assignments[i].status;
      a[i].description = assignments[i].description;
      a[i].end_date = assignments[i].end_date;


      a[i].user_ids = assignments[i].users_assigned;
      u = assignments[i].users_assigned;
      if ( u.includes(',') )
        u = u.split(',');
      else
        u = [u];

      a[i].topic_ids = assignments[i].topics;
        t = assignments[i].topics;
      if ( t.includes(',') )
        t = t.split(',');
      else
        t = [t];

      a[i].discussion_ids = assignments[i].discussion_ids;
      d = assignments[i].discussion_ids;
      if ( d.includes(',') )
        d = d.split(',');
      else
        d = [d];

      a_users = ""; // determining the users that are assigned to a certain assignment
      for ( j = 0; j < u.length; j = j + 1 )
      {
        user = {};
        for ( k = 0; k < users.length; k = k + 1 )
          if ( users[k].id == u[j] )
          {
            user = users[k];
            break;
          }

        a_users = a_users + user.username + " ( " + user.name + " )";

        if ( j != u.length - 1 )
          a_users = a_users + ',';
      }

      if ( assignments[i].users_assigned != "" )
        a[i].users_assigned = a_users;
      else
        a[i].users_assigned = [];

      a_topics = ""; // determining the topics of the assingment
      for ( j = 0; j < t.length; j = j + 1 )
      {
        topic = {};
        for ( k = 0; k < topics.length; k = k + 1 )
          if ( topics[k].id == t[j] )
          {
            topic = topics[k];
            break;
          }

        a_topics = a_topics + topic.name;

        if ( j != t.length - 1 )
          a_topics = a_topics + ',';
      }

      if ( assignments[i].topics != "" )
        a[i].topics = a_topics;
      else
        a[i].topics = [];


      a_discussions = ""; // determining all the discussions of the assignment
      for ( j = 0; j < d.length; j = j + 1 )
      {
        discussion = {};
        for ( k = 0; k < discussions.length; k = k + 1 )
          if ( discussions[k].id == d[j] )
          {
            discussion = discussions[k];
            break;
          }

        // if (discussion == {})
        //   console.log("IT DOESNT FIND IT -----------------------------")

        a_discussions = a_discussions + discussion.name;

        if ( j != d.length - 1 )
          a_discussions = a_discussions + ',';
      }

      if ( assignments[i].discussion_ids != "" )
        a[i].discussions = a_discussions;
      else
        a[i].discussions = [];

    }



     





    console.log(a);
    a = JSON.stringify(a);

    res.render('view_assignments', {user_id: req.session.user_id, user: req.session.user, assignments: a, user_of_assignments: user_of_assignments });
  })()

});


// view a topic (and all its assignments)
router.get('/view_topic:a', User.ensureAuthenticated, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    (async () => {
    id = req.params.a.slice(1);


    u = await User.find(); // selects all users from the database, so as to let the logged in user include them in a newly created assignment

    users = []

    for (i = 0; i < u.length; i = i + 1) // object relational mapping as it were
    {
      users.push({});
      users[i].id = u[i].id;
      users[i].username = u[i].username;
      users[i].name = u[i].firstname + ' ' + u[i].lastname;
    }

    // users = JSON.stringify(users); // ONLY send data to the frontend as strings



    t = await Assignment.findTopics(); // selects all topics from the database, so as to let the logged in topic include them in a newly created assignment

    topics = []

    for (i = 0; i < t.length; i = i + 1) // object relational mapping as it were
    {
      topics.push({});
      topics[i].id = t[i].id;
      topics[i].name = t[i].name;
    }

    // topics = JSON.stringify(topics); // ONLY send data to the frontend as strings





    id_topic = await Assignment.findTopicById(id);

    console.log(id_topic);

    // selects all user assignments
    a = await Assignment.findAssignments();

    topic_a = [];

    for ( i = 0; i < a.length; i = i + 1 )
      if ( a[i].topics.includes(id) )
        topic_a.push(a[i]);

    assignments = topic_a;

    a = [];
    for ( i = 0; i < assignments.length; i = i + 1)
    {
      a.push({});
      a[i].id = assignments[i].id;
      a[i].name = assignments[i].name;
      a[i].discussion_id = assignments[i].discussion_id;
      a[i].status = assignments[i].status;
      a[i].description = assignments[i].description;
      a[i].end_date = assignments[i].end_date;

      a[i].user_ids = assignments[i].users_assigned;
      u = assignments[i].users_assigned;
      if ( u.includes(',') )
        u = u.split(',');
      else
        u = [u];

      a[i].topic_ids = assignments[i].topics;
        t = assignments[i].topics;
      if ( t.includes(',') )
        t = t.split(',');
      else
        t = [t];

      a[i].discussion_ids = assignments[i].discussion_ids;
      d = assignments[i].discussion_ids;
      if ( d.includes(',') )
        d = d.split(',');
      else
        d = [d];

      a_users = ""; // determining all the assignments of a topic
      for ( j = 0; j < u.length; j = j + 1 )
      {
        user = {};
        for ( k = 0; k < users.length; k = k + 1 )
          if ( users[k].id == u[j] )
          {
            user = users[k];
            break;
          }

        a_users = a_users + user.username + " ( " + user.name + " )";

        if ( j != u.length - 1 )
          a_users = a_users + ',';
      }

      if ( assignments[i].users_assigned != "" )
        a[i].users_assigned = a_users;
      else
        a[i].users_assigned = [];

      a_topics = ""; // determining all the topic names that are also within the assignments of the given topic
      for ( j = 0; j < t.length; j = j + 1 )
      {
        topic = {};
        for ( k = 0; k < topics.length; k = k + 1 )
          if ( topics[k].id == t[j] )
          {
            topic = topics[k];
            break;
          }

        a_topics = a_topics + topic.name;

        if ( j != t.length - 1 )
          a_topics = a_topics + ',';
      }

      if ( assignments[i].topics != "" )
        a[i].topics = a_topics;
      else
        a[i].topics = [];


      a_discussions = ""; // determining all the discussions of all the assignments containing the given topic
      for ( j = 0; j < d.length; j = j + 1 )
      {
        discussion = {};
        for ( k = 0; k < discussions.length; k = k + 1 )
          if ( discussions[k].id == d[j] )
          {
            discussion = discussions[k];
            break;
          }

        // if (discussion == {})
        //   console.log("IT DOESNT FIND IT -----------------------------")

        a_discussions = a_discussions + discussion.name;

        if ( j != d.length - 1 )
          a_discussions = a_discussions + ',';
      }

      if ( assignments[i].discussion_ids != "" )
        a[i].discussions = a_discussions;
      else
        a[i].discussions = [];
    }


    console.log(a);
    a = JSON.stringify(a);


    res.render('view_topic', {user_id: req.session.user_id, user: req.session.user, assignments: a, topic: id_topic });
    })();

  }
});

// remove a user / discussion / topic from a given assignment
router.get('/remove_from_assignment:a', User.ensureModerator, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (req.session.user == undefined) // check for the used to be authenticated
    res.redirect('/users/login');
  else
  {
    (async () => {
      console.log("IT ACTUALLY GETS HERE");

    arr = req.params.a.slice(1).split('!');

    remove_id = arr[0]; // if of the item that has to be removed
    assignment_id = arr[1]; // the id of the assignment that it has to be remoed from
    type = arr[2]; // the type of item that has to be removed
    page = arr[3]; // the webpage this function has to take the user to after completion

    console.log(remove_id);
    console.log(assignment_id);
    console.log(type);
    console.log(page);


    a = await Assignment.findAssignmentById( assignment_id );

    console.log(a);

    if ( type = "user" ) // removing a user from an assignment
    {
      u = a.users_assigned.split(',');

      new_u = "";
      for ( i = 0; i < u.length; i = i + 1 )
      {
        if ( u[i] == remove_id )
          continue;

        new_u = new_u + u[i];

        if ( i != u.length - 1 )
          new_u = new_u + ',';
      }

      update = { users_assigned: new_u }

      await Assignment.updateAssignment(update, assignment_id);
    }

    if ( new_u[0] == ',' )
      new_u = new_u.slice(1);
    if ( new_u[new_u.length - 1] == ',' )
      new_u = new_u.slice(0, -1)


    if ( type = "topic" ) // removing a topic from an assignment
    {
      t = a.topics.split(',');

      new_t = "";
      for ( i = 0; i < t.length; i = i + 1 )
      {
        if ( t[i] == remove_id )
          continue;

        new_t = new_t + t[i];

        if ( i != t.length - 1 )
          new_t = new_t + ',';
      }

      if ( new_t[0] == ',' )
        new_t = new_t.slice(1);
      if ( new_t[new_t.length - 1] == ',' )
        new_t = new_t.slice(0, -1)



      if ( type = "discussion" ) // removing a discussion from an assignment
      {
        console.log("IT ACTUALLY GETS HERE -------------------------------------------- discussion")

        d = a.discussion_ids.split(',');

        new_d = "";
        for ( i = 0; i < d.length; i = i + 1 )
        {
          console.log(d[i])

          if ( d[i] == remove_id )
          {
            console.log("SKIPS ON" + d[i] + " ======================================")
            continue;
          }

          new_d = new_d + d[i];

          if ( i != d.length - 1 )
            new_d = new_d + ',';
        }
      }

      if ( new_d[0] == ',' )
        new_d = new_d.slice(1);
      if ( new_d[new_d.length - 1] == ',' )
        new_d = new_d.slice(0, -1)



      update = { discussion_ids: new_d }

      await Assignment.updateAssignment(update, assignment_id);
    }

    res.redirect('/assignments/' + page);
    })()
  }
});

// change the status of an assignment (from a view assignment page)
router.get('/change_status:a', User.ensureAuthenticated, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (req.session.user == undefined) // check for the used to be authenticated
    res.redirect('/users/login');
  else
  {
    (async () => {

    console.log("change_status IT ACTUALLY GETS HERE");

    arr = req.params.a.slice(1).split('!');

    assignment_id = arr[0]; // id of the assingment that has to be updated
    status = arr[1]; // the status the assignment has to be changed to
    page = arr[2]; // the webpage this function has to take the user to after completion

    console.log(assignment_id);
    console.log(status);
    console.log(page);


    a = await Assignment.findAssignmentById( assignment_id);

    if ( req.session.user.type == "regular" && !a.users_assigned.includes(req.session.user_id) ) // chacking if a regular user is allowed to edit their the status of an assignment - they may only edit that if they are part of the respective assignment
    {
      res.render('index', {user: req.session.user, access_denied: true});
      return;
    }

    update = { status: status }

    await Assignment.updateAssignment(update, assignment_id);
  

    res.redirect('/assignments/' + page);
    })()
  }
});

// view just one assignment
router.get('/view_assignment:a', User.ensureAuthenticated, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (req.session.user == undefined) // check for the used to be authenticated
    res.redirect('/users/login');
  else
  {
    (async () => {
    id = req.params.a.slice(1);

    assignment = await Assignment.findAssignmentById( id );

    u = await User.find(); // selects all users from the database, so as to let the logged in user include them in a newly created assignment

    users = []

    for (i = 0; i < u.length; i = i + 1) // object relational mapping as it were
    {
      users.push({});
      users[i].id = u[i].id;
      users[i].username = u[i].username;
      users[i].name = u[i].firstname + ' ' + u[i].lastname;
    }

    // users = JSON.stringify(users); // ONLY send data to the frontend as strings



    t = await Assignment.findTopics(); // selects all topics from the database, so as to let the logged in topic include them in a newly created assignment

    topics = []

    for (i = 0; i < t.length; i = i + 1) // object relational mapping as it were
    {
      topics.push({});
      topics[i].id = t[i].id;
      topics[i].name = t[i].name;
    }

    // topics = JSON.stringify(topics); // ONLY send data to the frontend as strings



    d = await Discussion.find(); // selects all discussions from the database

    discussions = []

    for (i = 0; i < d.length; i = i + 1) // object relational mapping as it were
    {
      discussions.push({});
      discussions[i].id = d[i].id;
      discussions[i].name = d[i].name;
      discussions[i].members = d[i].members;
      discussions[i].banned_users = d[i].banned_users;
    }

    // discussions = JSON.stringify(discussions); // ONLY send data to the frontend as strings

    console.log(discussions);


    a = {};
    a.id = id;
    a.name = assignment.name;
    a.discussion_id = assignment.discussion_id;
    a.status = assignment.status;
    a.description = assignment.description;
    a.end_date = assignment.end_date;


    a.user_ids = assignment.users_assigned;
    u = assignment.users_assigned;
    if ( u.includes(',') )
      u = u.split(',');
    else
      u = [u];

    a.topic_ids = assignment.topics;
    t = assignment.topics;
    if ( t.includes(',') )
      t = t.split(',');
    else
      t = [t];

    a.discussion_ids = assignment.discussion_ids;
    d = assignment.discussion_ids;
    if ( d.includes(',') )
      d = d.split(',');
    else
      d = [d];

    a_users = ""; // determining all users assingmed to the assignment
    for ( j = 0; j < u.length; j = j + 1 )
    {
      user = {};
      for ( k = 0; k < users.length; k = k + 1 )
        if ( users[k].id == u[j] )
        {
          user = users[k];
          break;
        }

      a_users = a_users + user.username + " ( " + user.name + " )";

      if ( j != u.length - 1 )
        a_users = a_users + ',';
    }

    if ( assignment.users_assigned != "" )
     a.users_assigned = a_users;
    else
     a.users_assigned = [];



    a_topics = ""; // determining all topics of the assignment
    for ( j = 0; j < t.length; j = j + 1 )
    {
      topic = {};
      for ( k = 0; k < topics.length; k = k + 1 )
        if ( topics[k].id == t[j] )
        {
          topic = topics[k];
          break;
        }

      a_topics = a_topics + topic.name;

      if ( j != t.length - 1 )
        a_topics = a_topics + ',';
    }
    if ( assignment.topics != "" )
      a.topics = a_topics;
    else
      a.topics = [];

    a_discussions = ""; // determining all discussions of the assignment
    for ( j = 0; j < d.length; j = j + 1 )
    {
      discussion = {};
      for ( k = 0; k < discussions.length; k = k + 1 )
        if ( discussions[k].id == d[j] )
        {
          discussion = discussions[k];
          break;
        }

      // if (discussion == {})
      //   console.log("IT DOESNT FIND IT -----------------------------")

      a_discussions = a_discussions + discussion.name;

      if ( j != d.length - 1 )
        a_discussions = a_discussions + ',';
    }

    if ( assignment.discussion_ids != "" )
      a.discussions = a_discussions;
    else
      a.discussions = [];

    console.log(a);
    a = JSON.stringify(a);

    res.render('view_assignment', {user_id: req.session.user_id, user: req.session.user, assignment: a});

    })()
  }
});


// admin table view for topics
router.get('/view_admin_topics', User.ensureAdmin, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    (async () => {
      t = await Assignment.findTopics();

      res.render('view_admin_topics', {t: JSON.stringify(t), user: req.session.user});
    })();
  }
});

module.exports = router;
