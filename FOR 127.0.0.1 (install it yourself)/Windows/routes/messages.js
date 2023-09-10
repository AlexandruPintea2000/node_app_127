var express= require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcryptjs');
const session = require('express-session')
var formidable = require('formidable');
var fs = require('fs');
const path = require('path')
var request = require('request');
var nodemailer= require('nodemailer');
var mongoose = require('mongoose');

// importing all required model files
var Message = require('../models/message');
var Discussion = require('../models/discussion');
var User = require('../models/user');
var Assignment = require('../models/assignment');


// page to view all the user messages
router.get('/create_message:a', User.ensureAuthenticated, function(req,res){
  (async () => {
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (User.ensureAuthenticated == false)
  {
    res.redirect('/users/login');
    return;
  }
    discussion_id = req.params.a.slice(1);
    have_discussion = false // determining if the user has to be send to a specific discussion or not (since this function can return the view page of any discussion, based on its id)
    if ( discussion_id != "" || discussion_id == "#down" )
        have_discussion = true

    // user_messages = await Message.getUserMessages( req.session.user_id ); // should get all messages maybe and just display them to the user in case they want to join some of those discussions

    all_messages = await Message.find();

    for ( i = 0; i < all_messages.length; i = i + 1 )
      if ( all_messages[i].text == "((INVISIBLE_MESSAGE_TO_UPDATE_SENT_FILE))" )
        await Message.deleteMessage(all_messages[i].id);

    all_messages = await Message.find();


    // console.log("MESSAGES");
    // // console.log(all_messages);
    // all_messages = JSON.parse(all_messages);
    console.log(all_messages);

    // user_discussions = await Discussion.getDiscussionsByUserId( req.session.user_id );
    // user_discussions = JSON.parse(user_discussions);
    // console.log(user_discussions);

    all_discussions = await Discussion.find();
    // all_discussions = JSON.parse(all_discussions);
    // console.log("HERE ARE ----- all_discussions");

    // for ( i = 0; i < 40000; i = i + 1){} 


    var r = []; // this is the response array. It is the array that is going to be turned into a string and send to the frontend

    for (i = 0; i < all_discussions.length; i = i + 1)
    {
      var result = {}; // an entry in the above array
      result.id = all_discussions[i].id;
      result.name = all_discussions[i].name;
      // if ( all_discussions[i].members.includes(',') )
      //   result.members = all_discussions[i].members.split(',');
      // else
      //   result.members = [all_discussions[i].members];

      // console.log("HERE ARE -------- result.members");
      
      // console.log(result.members);

     if ( all_discussions[i].members.includes(',') )
        result.member_ids = all_discussions[i].members.split(',');
      else
        result.member_ids = [all_discussions[i].members];

      if ( all_discussions[i].banned_users.includes(',') )
        result.banned_user_ids = all_discussions[i].banned_users.split(',');
      else
        result.banned_user_ids = [all_discussions[i].banned_users];

      result.members = [];
      result.member_names = [];
      // users_arr = [];
      // for (j = 0; j < result.member_ids.length; j = j + 1)
      // {
      //   usr = await User.findById(result.member_ids[j]);
      //   await users_arr.push( usr );
      // }

      // for (j = 0; j < result.member_ids.length; j = j + 1)
      //   result.member_ids[j] = new mongoose.Types.ObjectId(result.member_ids[j]);
      
      // const users_arr = User.find({
      //     '_id': { $in: result.member_ids}
      // });

      users_arr = [];
      if ( !result.members.includes('') )
        users_arr = await User.find().where('_id').in(result.member_ids).exec();

      if ( result.members[0] != "" )
      for (j = 0; j < users_arr.length; j = j + 1)
      {
        if ( result.members.includes( users_arr[j].username ) == true )
          continue;

        result.members.push( users_arr[j].username );
        result.member_names.push( users_arr[j].firstname + " " + users_arr[j].lastname );
      }
      result.banned_usernames = [];
      result.banned_usernames = [];

      console.log("result.banned_user_ids")
      console.log(result.banned_user_ids)

      banned_users_arr = [];
      if ( !result.banned_user_ids.includes('') )
        banned_users_arr = await User.find().where('_id').in(result.banned_user_ids).exec();

      if ( result.banned_user_ids[0] != "" )
      for (j = 0; j < banned_users_arr.length; j = j + 1)
      {
        if ( result.banned_usernames.includes( banned_users_arr[j].username ) == true )
          continue;

        // user = await User.findById(result.banned_user_ids[j]); // get the user data of each member in a discussion by their ud, so as to be able to display their usernames instead of their ids-
        result.banned_usernames.push( banned_users_arr[j].username );
        result.member_names.push( banned_users_arr[j].firstname + " " + banned_users_arr[j].lastname );
      }
      // result.messages = []; // array for all the messages ina  discussion
      messages = [];
      console.log("gets to the get");



      for (j = 0; j < all_messages.length; j = j + 1) // go though all the messages, so as to decide which belong to the currently considered discussion
      {
        // if ( String( all_messages[j] ) == 'undefined' )
        //   continue;

        // console.log(all_messages[j].discussion_id)
        // console.log(result.id)
        // console.log("j")
        // console.log(j)

        if (all_messages[j].discussion_id != result.id) // id the message does not belong to the discussion, do not include it in the array of messages of this disucssion
          continue;

		    // if the 
        // source_user = await User.findById(all_messages[j].sender_id);

        source_username = "";
        for ( p = 0; p < users_arr.length; p = p + 1 )
          if ( users_arr[p].id == all_messages[j].sender_id )
          {
            source_username = users_arr[p].username;
            break;
          }
        for ( p = 0; p < banned_users_arr.length; p = p + 1 )
          if ( banned_users_arr[p].id == all_messages[j].sender_id )
          {
            source_username = banned_users_arr[p].username;
            break;
          }


        // console.log("HERE IS ------ all_messages[j]");
        // console.log(all_messages[j]);

        // console.log("HERE IS ------ source_user");
        // console.log(source_user);

        if ( source_username == "" )
        {
          if ( String( all_messages[j] ) != "undefined" )
          k = { id:all_messages[j].id, source_username: source_username, text:all_messages[j].text, createdAt: all_messages[j].createdAt, updatedAt: all_messages[j].updatedAt }; // this should NOT be in the final version of the app
        }
        else
        {
          if ( String( all_messages[j] ) != "undefined" )
         k = { id:all_messages[j].id, source_username: source_username, text:all_messages[j].text, createdAt: all_messages[j].createdAt, updatedAt: all_messages[j].updatedAt }; // form an message objec (orm) and add it to the message array
        }        
        messages.push( k );
      }
      
      result.messages = messages;
      // console.log("result");
      // console.log(result);
      r.push(result); // add all the previously mentioned data to the response array
    }
    
    // console.log("ok");


    // SEND TO UI  JUST AS STRING !!!!
    // all_discussions = JSON.stringify(all_discussions);
    // all_messages = JSON.stringify(all_messages);
    console.log("HERE IS R")
    console.log(r)


    r = JSON.stringify(r);

    u = await User.find();

    users = []

    for (i = 0; i < u.length; i = i + 1) // send all the users ot the ui as well
    {
      users.push({});
      users[i].id = u[i].id;
      users[i].username = u[i].username;
      users[i].name = u[i].firstname + ' ' + u[i].lastname;
    }

    users = JSON.stringify(users);

    logged_user = await User.findById(req.session.user_id);

    if ( have_discussion )
      res.render('create_message', {user_id: req.session.user_id, user: JSON.stringify(logged_user), r:r, users: users, discussion_id: discussion_id });
    else
      res.render('create_message', {user_id: req.session.user_id, user: JSON.stringify(logged_user), r:r, users: users });
  })()
});








// this function was supposed to give socket.io an updated 'r' variable, containing discussions filled wiht their messages - it is not currently being used
router.post('/get_r', async function(req,res){
    // user_messages = await Message.getUserMessages( req.session.user_id ); // shoudl get all messages maybe and just display em to the user in case they wanna join some of those discussions

    all_messages = await Message.find();

    // console.log("MESSAGES");
    // // console.log(all_messages);
    // all_messages = JSON.parse(all_messages);
    console.log(all_messages);

    // user_discussions = await Discussion.getDiscussionsByUserId( req.session.user_id );
    // user_discussions = JSON.parse(user_discussions);
    // console.log(user_discussions);

    all_discussions = await Discussion.find();
    // all_discussions = JSON.parse(all_discussions);
    // console.log("HERE ARE ----- all_discussions");
    console.log(all_discussions);


    var r = []; // this is the response array. It is the array that is going to be turned into a string and send to the frontend

    for (i = 0; i < all_discussions.length; i = i + 1)
    {
      var result = {}; // an entry in the above array
      result.id = all_discussions[i].id;
      result.name = all_discussions[i].name;
      // if ( all_discussions[i].members.includes(',') )
      //   result.members = all_discussions[i].members.split(',');
      // else
      //   result.members = [all_discussions[i].members];

      // console.log("HERE ARE -------- result.members");
      
      // console.log(result.members);

     if ( all_discussions[i].members.includes(',') )
        result.member_ids = all_discussions[i].members.split(',');
      else
        result.member_ids = [all_discussions[i].members];

      if ( all_discussions[i].banned_users.includes(',') )
        result.banned_user_ids = all_discussions[i].banned_users.split(',');
      else
        result.banned_user_ids = [all_discussions[i].banned_users];

      result.members = [];
      result.member_names = [];
      users = [];
      for (j = 0; j < result.member_ids.length; j = j + 1)
        users.push( await User.findById(result.member_ids[j]) );

      for (j = 0; j < users.length; j = j + 1)
      {
        if ( result.members.includes( users[j].username ) )
          continue;

        result.members.push( users[j].username );
        result.member_names.push( users[j].firstname + " " + users[j].lastname );
      }
      result.banned_usernames = [];
      result.banned_usernames = [];
      for (j = 0; j < result.banned_user_ids.length; j = j + 1)
      {
        user = await User.findById(result.banned_user_ids[j]); // get the user data of each member in a discussion by their ud, so as to be able to display their usernames instead of their ids-
        result.banned_usernames.push( user.username );
        result.member_names.push( user.firstname + " " + user.lastname );
      }
      // result.messages = []; // array for all the messages ina  discussion
      messages = [];
      console.log("gets to the get");
      for (j = 0; j < all_messages.length; j = j + 1) // go though all the messages, so as to decide which belong to the currently considered discussion
      {
        // if ( String( all_messages[j] ) == 'undefined' )
        //   continue;

        // console.log(all_messages[j].discussion_id)
        // console.log(result.id)
        // console.log("j")
        // console.log(j)

        if (all_messages[j].discussion_id != result.id) // id the message does not belong to the discussion, do not include it in the array of messages of this disucssion
          continue;

        // if the 
        source_user = await User.findById(all_messages[j].sender_id);


        // console.log("HERE IS ------ all_messages[j]");
        // console.log(all_messages[j]);

        // console.log("HERE IS ------ source_user");
        // console.log(source_user);


       
        if ( source_user == null )
        {
          if ( String( all_messages[j] ) != "undefined" )
          k = { id:all_messages[j].id, source_username: "deleted", text:all_messages[j].text, createdAt: all_messages[j].createdAt, updatedAt: all_messages[j].updatedAt }; // this should NOT be in the final version of the app
        }
        else
        {
          if ( String( all_messages[j] ) != "undefined" )
         k = { id:all_messages[j].id, source_username: source_user.username, text:all_messages[j].text, createdAt: all_messages[j].createdAt, updatedAt: all_messages[j].updatedAt }; // form an message objec (orm) and add it to the message array
        }        
        messages.push( k );
      }
      
      result.messages = messages;
      // console.log("result");
      // console.log(result);
      r.push(result); // add all the previously mentioned data to the response array
    }
    
    // console.log("ok");


    // SEND TO UI  JUST AS STRING !!!!
    // all_discussions = JSON.stringify(all_discussions);
    // all_messages = JSON.stringify(all_messages);
    console.log("HERE IS R")
    console.log(r)


    // r = JSON.stringify(r);

    res.send({r:r});
});


// this function was meant for sending socket.io the updated user, mainly for it to check for updated hidden_messages - it is not currentl in use
router.post('/get_user', async function(req,res){
   res.send({user: User.findById( res.body.user_id )});
});






// user sends a message, to a discussion - this funciton was replaces by create_message_socket and it not currently in use
router.post('/create_message', function(req,res){
var sender_id = "";
var its_a_file = false
if ( typeof req.body.sender_id != 'undefined' )
{
  its_a_file = true;
  sender_id = req.body.sender_id;
}
else
  sender_id = req.session.user_id;
req.session.user_id;
var text = req.body.text;

if ( !its_a_file && text[0] == '[' && text[1] == '[' ) // so that users cannot add filenames that are not real to the db
  text = ' ' + text;




var discussion_id = req.body.discussion;


console.log("discussion_id");
console.log(discussion_id);

text = text.replace(/\r\n/g, "<br/>");

console.log("done ok");
console.log( sender_id );
console.log( text );

//validation
req.checkBody('discussion_id', 'Discussion is required').notEmpty();
req.checkBody('text', 'Text is required').notEmpty();

  (async () => {

    u = await User.find();

    for ( z = 0; z < u.length; z = z + 1 )
      text = text.replaceAll(">" + u[z].username, "<a href='/users/view_user:" + u[z].id + "'>" + u[z].username + "</a>");

    t = await Assignment.findTopics();

    for ( z = 0; z < t.length; z = z + 1 )
      text = text.replaceAll("&" + t[z].name, "<a href='/assignments/view_topic:" + t[z].id + "'>" + t[z].name + "</a>");

    d = await Discussion.find();

    for ( z = 0; z < d.length; z = z + 1 )
      text = text.replaceAll("%" + d[z].name, "<a href='/messages/create_message:" + d[z].id + "'>" + d[z].name + "</a>");

    a = await Assignment.findAssignments();

    for ( z = 0; z < a.length; z = z + 1 )
      text = text.replaceAll("!" + a[z].name, "<a href='/assignments/view_assignment:" + a[z].id + "'>" + a[z].name + "</a>");


    discussion = await Discussion.findById(discussion_id);

    if ( discussion.banned_users.includes( req.session.user_id ) )
    {
      res.redirect( "/messages/create_message:" );
      return;
    }

    await Message.createMessage({ sender_id:sender_id, discussion_id: discussion_id, text:text }, function(err,message){
      if(err) throw err;
      console.log(message);
    });

    if (!discussion.members.includes(sender_id))
    {
      new_members = "";
      if (discussion.members != "")
        new_members = discussion.members + ',' + sender_id;
      else
        new_members = sender_id;

      // console.log(new_members);


      if ( new_members[0] == ',' )
        new_members = new_members.slice(1);
      if ( new_members[new_members.length - 1] == ',' )
        new_members = new_members.slice(0, -1)

      var update = {
        members: new_members
      };

      Discussion.updateDiscussion(update, discussion_id);
    }

    res.redirect( "/messages/create_message:" );

})()
  });



// user sends a message, to a discussion
router.post('/create_message_socket', function(req,res){
var sender_id = req.body.sender_id;

var text = req.body.text;




var discussion_id = req.body.discussion;


console.log("discussion_id");
console.log(discussion_id);


console.log("done ok");
console.log( sender_id );
console.log( text );

//validation
req.checkBody('discussion_id', 'Discussion is required').notEmpty();
req.checkBody('text', 'Text is required').notEmpty();

  (async () => {

    u = await User.find().sort({"username": -1});

    for ( z = 0; z < u.length; z = z + 1 )
    {
      if ( text.includes( "'>" + u[z].username ) )
        continue;

      text = text.replaceAll(">" + u[z].username, "<a href='/users/view_user:" + u[z].id + "'>" + u[z].username + "</a>");
    }

    t = await Assignment.findTopics();

    for ( z1 = 0; z1 < t.length - 1; z1 = z1 + 1 )
      for ( z2 = z1 + 1; z2 < t.length; z2 = z2 + 1 )
        if ( t[z1].name.length < t[z2].name.length )
        {
          swap = t[z1];
          t[z1] = t[z2];
          t[z2] = swap;
        }

    for ( z = 0; z < t.length; z = z + 1 )
      text = text.replaceAll("&" + t[z].name, "<a href='/assignments/view_topic:" + t[z].id + "'>" + t[z].name + "</a>");

    d = await Discussion.find().sort({"name": -1});

    for ( z = 0; z < d.length; z = z + 1 )
      text = text.replaceAll("%" + d[z].name, "<a href='/messages/create_message:" + d[z].id + "'>" + d[z].name + "</a>");

    a = await Assignment.findAssignments();

    for ( z1 = 0; z1 < a.length - 1; z1 = z1 + 1 )
      for ( z2 = z1 + 1; z2 < a.length; z2 = z2 + 1 )
        if ( a[z1].name.length < a[z2].name.length )
        {
          swap = a[z1];
          a[z1] = a[z2];
          a[z2] = swap;
        }

    for ( z = 0; z < a.length; z = z + 1 )
      text = text.replaceAll("!" + a[z].name, "<a href='/assignments/view_assignment:" + a[z].id + "'>" + a[z].name + "</a>");

    text = text.replace(/\r\n/g, "<br/>");
    text = text.replaceAll("_system_enter_", "<br/>");


    discussion = await Discussion.findById(discussion_id);

    if ( discussion.banned_users.includes( req.session.user_id ) )
    {
      res.send( {banned: true, user: req.body.user, discussion_id: discussion_id, r: req.body.r} );
      return;
    }

    // if ( text != "((INVISIBLE_MESSAGE_TO_UPDATE_SENT_FILE))" )
    m = await Message.createMessage({ sender_id:sender_id, discussion_id: discussion_id, text:text }, function(err,message){
      if(err) throw err;
      console.log(message);
    });

    if (!discussion.members.includes(sender_id))
    {
      new_members = "";
      if (discussion.members != "")
        new_members = discussion.members + ',' + sender_id;
      else
        new_members = sender_id;


      if ( new_members[0] == ',' )
        new_members = new_members.slice(1);
      if ( new_members[new_members.length - 1] == ',' )
        new_members = new_members.slice(0, -1)

      // console.log(new_members);

      var update = {
        members: new_members
      };

      Discussion.updateDiscussion(update, discussion_id);
    }

    res.send({ new_message:m, user: req.body.user, discussion_id: discussion_id, r: req.body.r})
})()
  });
  
  


// delete a message
router.get('/delete:a', User.ensureAuthenticated, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (req.session.user == undefined)
    res.redirect('/users/login');
  else
  {
  (async () => {
 
    msg_id = req.params.a.slice(1);

    m = await Message.findById(msg_id);
    if ( req.session.user.type == "regular" && m.sender_id != req.session.user_id )
    {
      res.redirect('/messages/create_message:');
      return;
    }

    console.log("msg_id");
    console.log(msg_id);
    Message.deleteMessage(msg_id);
    res.redirect('/messages/create_message:');

  })()
  }
});

console.log("done");

console.log("gata");

// edit a message
router.post('/edit', User.ensureAuthenticated, function(req,res){
  (async () => {

  if (req.session.user == undefined)
    res.redirect('/users/login');

  var text = req.body.msg;

   u = await User.find().sort({"username": -1}); // get the users sorted their username, in a descending order so that the usernames with are iterated though from the longest to the shortest, so as to replace the longest ones first with links, in case the user wanted them linked to their user view page

    for ( z = 0; z < u.length; z = z + 1 )
    {
      if ( text.includes( "'>" + u[z].username ) )
        continue;

      text = text.replaceAll(">" + u[z].username, "<a href='/users/view_user:" + u[z].id + "'>" + u[z].username + "</a>");
    }

    t = await Assignment.findTopics();

    for ( z1 = 0; z1 < t.length - 1; z1 = z1 + 1 ) // sort topics from the longest topic name to the shortest
      for ( z2 = z1 + 1; z2 < t.length; z2 = z2 + 1 )
        if ( t[z1].name.length < t[z2].name.length )
        {
          swap = t[z1];
          t[z1] = t[z2];
          t[z2] = swap;
        }

    for ( z = 0; z < t.length; z = z + 1 )
      text = text.replaceAll("&" + t[z].name, "<a href='/assignments/view_topic:" + t[z].id + "'>" + t[z].name + "</a>");

    d = await Discussion.find().sort({"name": -1}); // get the discusssions sorted their name, in a descending order so that the names with are iterated though from the longest to the shortest, so as to replace the longest ones first with links, in case the user wanted them linked to their discussion view page

    for ( z = 0; z < d.length; z = z + 1 )
      text = text.replaceAll("%" + d[z].name, "<a href='/messages/create_message:" + d[z].id + "'>" + d[z].name + "</a>");

    a = await Assignment.findAssignments();

    for ( z1 = 0; z1 < a.length - 1; z1 = z1 + 1 )// sort assignments from the longest topic name to the shortest
      for ( z2 = z1 + 1; z2 < a.length; z2 = z2 + 1 )
        if ( a[z1].name.length < a[z2].name.length )
        {
          swap = a[z1];
          a[z1] = a[z2];
          a[z2] = swap;
        }

    for ( z = 0; z < a.length; z = z + 1 )
      text = text.replaceAll("!" + a[z].name, "<a href='/assignments/view_assignment:" + a[z].id + "'>" + a[z].name + "</a>");

    text = text.replace(/\r\n/g, "<br/>");
    text = text.replaceAll("_system_enter_", "<br/>");


  var msg = text;
  var id = req.body.id;

  m = await Message.findById(id);
  if ( req.session.user.type == "regular" && m.sender_id != req.session.user_id ) // regular users are only permitted to edit a message if they sent it
  {
    res.redirect('/messages/create_message:');
    return;
  }

  msg = msg.replace(/\r\n/g, "<br/>");
  msg = msg.replace(/_system_enter_/g, "<br/>");

  var update = {
    text: msg
  }
  
  Message.updateMessage(update, id);
  })()

  // res.redirect('/messages/create_message:');
});

// hide a message for a certain user
router.post('/hide', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined)
    res.redirect('/users/login');

  (async () => {

  var id = req.body.id;

  user = await User.findById(req.session.user_id);

  if ( user.hidden_messages == "" || typeof user.hidden_messages == 'undefined' ) // check if the user has had any hidden messages before
    user.hidden_messages = id;
  else
    if ( !user.hidden_messages.includes(id) )
      user.hidden_messages = user.hidden_messages + ',' + id;

  var update = {
    hidden_messages: user.hidden_messages
  }
  
  req.session.user = user;

  User.updateUser(update, req.session.user_id, function(err,user){
      if(err) throw err;
        console.log(user);
  });
  })()

  // res.redirect('/messages/create_message:');
});

// show a hidden message
router.post('/show', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined)
    res.redirect('/users/login');

  (async () => {

  var id = req.body.id;

  user = await User.findById(req.session.user_id);

  hidden_messages = user.hidden_messages.split(',');

  new_hidden_messages = []; // remake the array containing message ids, excluding the mention message the user wants to hide
  for ( i = 0; i < hidden_messages.length; i = i + 1 )
    if ( hidden_messages[i] != id )
      new_hidden_messages.push(hidden_messages[i]);

  updated_hidden_messages = ""; // convert the array to a comma-separated string of ids
  for ( i = 0; i < new_hidden_messages.length; i = i + 1 )
  {
    updated_hidden_messages = updated_hidden_messages + new_hidden_messages[i];
    if ( i != new_hidden_messages.length - 1 )
      updated_hidden_messages = updated_hidden_messages + ',';
  }

  if ( updated_hidden_messages[0] == ',' )
    updated_hidden_messages = updated_hidden_messages.slice(1);
  if ( updated_hidden_messages[updated_hidden_messages.length - 1] == ',' )
    updated_hidden_messages = updated_hidden_messages.slice(0, -1)

  var update = {
    hidden_messages: updated_hidden_messages
  }

  req.session.user = user;

  User.updateUser(update, req.session.user_id, function(err,user){
      if(err) throw err;
        console.log(user);
  });
  })()

  // res.redirect('/messages/create_message:');
});

// user uploads a file
router.post('/file_upload', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined)
    res.redirect('/users/login');
  else
  {
    var form = new formidable.IncomingForm();

    form.parse(req, function (err, fields, files) {

    console.log("HERE ARE THE ---------- fields");
    console.log(fields);

    var uploaded_filenames = [];

    for ( i = 0; i < files.file_upload.length; i = i + 1 )
    {
      var oldpath = files.file_upload[i].filepath;
      // var newpath = 'C:/Users/user/' + files.file_upload.originalFilename;



      filename_iter = 0;

      user_filename_name = files.file_upload[i].originalFilename

      if (files.file_upload[i].originalFilename.includes("(("))
        user_filename_name = files.file_upload[i].originalFilename.replace("((", "([replace]("); // if the filename the user chose for its file has (( within it, they have to be replaced since those are used to numerotate files for when they have the same filename e.g. edit.png / edit ((0)).png / edit ((1)) can co-exist in the same folder - when shown to the user, the "([replace](" string shall be replaced back with "(("

      console.log("HERE IS user_filename_name");
      console.log(user_filename_name);

      newpath = path.join(__dirname, '../uploads') + '\\' + user_filename_name // determining the path of the file


      is_filename = true; // assume the filename is already taken
      try 
      {
          let stats = fs.statSync(newpath);
      }
      catch (err) // the filename is not taken
      {
        is_filename = false;
      }


      while (is_filename) // if the filename is already taken, add a number to it, like: ((0)), ((1)) ...
      {  
        try {
            let stats = fs.statSync(newpath);

            // console.log('is file ? ' + stats.isFile());
            // console.log('is directory? ' + stats.isDirectory()); 

            if (files.file_upload[i].originalFilename.includes("(("))
                user_filename_name = files.file_upload[i].originalFilename.replace("((", "([replace](");
            else
              user_filename_name = files.file_upload[i].originalFilename;

            console.log("HERE IS user_filename_name");
            console.log(user_filename_name);

            user_filename_ext = ""

            if ( user_filename_name.includes('.') ) // divide file into filename and extension
            {
              u = user_filename_name.split('.');
              user_filename_name = u[0];
              user_filename_ext = u[1];
            }

            if ( user_filename_ext != "" ) // generate the filename based on whether the filename has an extension or not and on the number stored in filename_iter - filename_iter goes thought all possibilities for filenames, checking which numbers have been already used for the given filename 
              user_filename_name = user_filename_name + ' ((' + String(filename_iter) + ')).' + user_filename_ext;
            else
              user_filename_name = user_filename_name + ' ((' + String(filename_iter) + "))"

            filename_iter = filename_iter + 1;

            newpath = path.join(__dirname, '../uploads') + '\\' + user_filename_name;
        
        }
        catch(err) {
          // console.log(user_filename_name);
          // console.log(newpath);
          is_filename = false;
        }
      }
      
      uploaded_filenames.push(user_filename_name); // user uploading more files at once is supported

      // console.log("HERE IS -------- newpath");
      // console.log(newpath);

      fs.rename(oldpath, newpath, function (err) { // move each file to its final destination on the server
        if (err) throw err;
        console.log('File uploaded and moved!');
        res.end();
      });
    }

    console.log(uploaded_filenames);

    msg_text = "[[files:"; // the encoding of the message that is going to contain the user-uploaded files - this encoding is used on the UI to properly display all sent files to the users

    for ( i = 0; i < uploaded_filenames.length; i = i + 1 )
    {
      msg_text = msg_text + uploaded_filenames[i];

      if ( i != uploaded_filenames.length - 1 )
        msg_text = msg_text + '\\/';
    }

    msg_text = msg_text + "]]"

    console.log(msg_text);

    discussion_id = fields.discussion[0];

    sender_id = req.session.user_id;

    request.post( // add the message to the db by formulating a POSt request
        'http://127.0.0.1:8081/messages/create_message',
        { json: { sender_id: sender_id, text: msg_text, discussion: discussion_id, user: req.session.user } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            }
            if ( error )
                console.log(error);
        }
    );

    res.redirect('/messages/create_message:');

    });
    // do NOT put anything here - this gets executed before the previous thing
  }
});


// download a file that a user uploaded
router.get('/download:a', User.ensureAuthenticated, function(req, res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  f = req.params.a.slice(1).split('!');

  server_filename = f[0];
  download_filename = f[1]; // if the user filename was had any replacing done to it to preserve the integrity of the fliename encoding, it shall be reverted and sent to the UI for display

  // to change the filename to the original filename that the user uploaded, the file has to be first renamed and moved to the "download" folder on the server, before the user can download them

  const server_file = path.join(__dirname, '../uploads') + '\\' + server_filename; // encoded filename

  const download_file = path.join(__dirname, '../downloads') + '\\' + download_filename; // initial user-chosen filename

  fs.copyFile(server_file, download_file, function (err) { // copying the file and downloading it
    if (err) throw err;
    console.log('File copied!');
    res.download(download_file); // Set disposition and send it.
  });

});


// send a notification message (a message that gets sent to all the users' emails that are part of the discussion)
router.get('/send_notif_msg:a', User.ensureAuthenticated, function(req, res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  (async () => {
  discussion_id = req.params.a.slice(1);

  have_msg = false; // check if the user entered any text within the text field - if not, a standard messages will be sent
  msg_text  = "";
  if ( discussion_id[0] == '!' ) // this is how checking for message text functions, an '!' is added to the GET request data
  {
    have_msg = true;
    discussion_id = discussion_id.slice(1);
    console.log(discussion_id);
    arr = discussion_id.split('!');
    msg_text = arr[0].replaceAll("_system_enter_", "<br/>");
    discussion_id = arr[1];
    console.log(msg_text);
    console.log(discussion_id);
  }
// !ok&lt;br&#47;&gt;&lt;br&#47;&gt;send%20this!64de3cf0f5fbb5d7b1984a79


  sender_id = req.session.user_id;
  if (have_msg == false)
    msg_text = "Come to the discussion!"; // the default text that gets emailed and sent as a message if the user did not input any custom text

  request.post( // adding the message to the eb by formulating a POST request
      'http://127.0.0.1:8081/messages/create_message',
      { json: { sender_id: sender_id, text: msg_text, discussion: discussion_id } },
      function (error, response, body) {
          if (!error && response.statusCode == 200) {
              console.log(body);
          }
      }
  );

  d = await Discussion.findById(discussion_id);

  mbrs = d.members.split(',');
  bu = d.banned_users.split(',');

  emails = [];

  for ( i = 0; i < mbrs.length; i = i + 1 ) // put together the array of users that have to be sent the email
  {
    if ( bu.includes(mbrs[i]) )
      continue; // skip banned users

    u = await User.findById(mbrs[i]);
    emails.push(u.email);
  }

  // sending the email
  var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'apaluza345@gmail.com',
    pass: 'dnddlxgwhholdqqb' // password provided by the email service provider as an "app password"
  }
  });

  if (have_msg == false)
    var mailOptions = {
      replyTo: req.session.user.email,
      to: emails,
      subject: "Come to the '" + d.name + "' discussion",
      text: "This email was sent by " + req.session.user.username + " ( " + req.session.user.firstname + req.session.user.lastname + " ) to tell you to check out the '" + d.name + "' discussion. The text was formulated by the system."
    };
  else
    var mailOptions = {
      replyTo: req.session.user.email,
      to: emails,
      subject: "Come to the '" + d.name + "' discussion",
      html: "This email was sent by " + req.session.user.username + " ( " + req.session.user.firstname + req.session.user.lastname + " ) to tell you to check out the '" + d.name + "' discussion. " + req.session.user.username + " says:<br/>" + msg_text
    };
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent to ' + String( emails ) + ': ' + info.response);
      console.log(msg_text);
      console.log(emails);
      console.log(bu);
      console.log(mbrs);

    }
  });
  

  res.redirect('/messages/create_message:');


  })()


});

console.log("done");

module.exports = router;
