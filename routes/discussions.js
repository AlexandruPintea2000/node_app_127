var express= require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcryptjs');
const session = require('express-session')

// import required model files
var Message = require('../models/message');
var Discussion = require('../models/discussion');
var User = require('../models/user');

console.log("gata")
console.log("done");
console.log("ok");
// page used to create a discussion
router.get('/create_discussion:a', User.ensureModerator, function(req,res){
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
    discussion_id = req.params.a.slice(1);

    u = await User.find(); // selects all users from the database, so as to let the logged in user include them in a newly created discusssion

    users = []

    for (i = 0; i < u.length; i = i + 1) // object relational mapping as it were
    {
      users.push({});
      users[i].id = u[i].id;
      users[i].username = u[i].username;
      users[i].name = u[i].firstname + ' ' + u[i].lastname;
    }

    users = JSON.stringify(users); // ONLY send data to the frontend as strings


    d = await Discussion.find(); // selects all discussions from the database, so as to let the logged in discussion include them in a newly created discusssion

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

 


    res.render('create_discussion', {user_id: req.session.user_id, user: req.session.user, users: users, discussions: discussions, discussion_id: discussion_id });
  })()
});

// user creates a discussion
router.post('/create_discussion', User.ensureModerator, function(req,res){
(async () => {
var id = req.body.id;
edit = false; // determining if the user wants to edit or create a discussion
if (req.body.id == "")
  edit = false;
else
  edit = true;

var name = req.body.title;
var members = req.body.ids;
var banned_users = req.body.banned_ids;

console.log( id )
console.log( name )
console.log( members )
console.log( members )

// change from 'create discussion' to 'edit discussion' if the title is pre-existent - assuming that was the user's intention
if ( edit == false )
{
  id = await Discussion.haveDiscussionAlready(name);
  console.log( typeof id )


  if ( id != -1 && id != "undefined" ) // if the user creates a discussion with a pre-existent discussion name, it is assumed that the user wants to edit that discussion
    edit = true;
}

//validation
req.checkBody('name', 'Name is required').notEmpty();
req.checkBody('members', 'Members are required').notEmpty();

console.log( String(edit) )



if ( members[0] == ',' )
  members = members.slice(1);
if ( members[members.length - 1] == ',' )
  members = members.slice(0, -1)

if (edit == true)
{
  update = { name: name, members: members, banned_users: banned_users };

  Discussion.updateDiscussion(update, id);
}
else
  Discussion.createDiscussion( { name: name, members: members, banned_users: banned_users } );


return res.redirect( "/discussions/create_discussion:" );
// return to the page where the user was before, where the new discussion can be viewed and used
})()
});

// delete a discussion (and all its messages)
router.post('/delete_discussion', User.ensureModerator, function(req,res){
  if (req.session.user == undefined) // check for the used to be authenticated
    res.redirect('/users/login');
  else
  {
  (async () => {
    id = req.body.id

    Discussion.deleteDiscussion(id);

    // remove the discussion id from all messages (meaning those messages are deleted)
    // m = await Message.find();

    // for ( i = 0; i < m.length; i = i + 1 ) // delete all discussion messages
    //   if ( m[i].discussion_id == id )
    // await Message.deleteMany({ discussion_id: id });  

    return res.redirect( "/discussions/create_discussion:" );
  })()

  }
});


// administrator table for viewing and editing discussions
router.get('/view_admin_discussions', User.ensureAdmin, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    (async () => {

      d = await Discussion.find();
      discussions = []

      for (i = 0; i < d.length; i = i + 1) // send all the users ot the ui as well
      {
        discussions.push({});
        discussions[i].id = d[i].id;
        discussions[i].name = d[i].name;
        discussions[i].member_ids = d[i].members;

        u = d[i].members;
        if ( u.includes(',') )
           u = u.split(',');
         else
           u = [u];
        member_usernames = [];

        users_arr = [];
        if ( !u.includes('') )
          users_arr = await User.find().where('_id').in(u).exec();


        for ( j = 0; j < users_arr.length; j = j + 1 )
          member_usernames.push(users_arr[j].username + " ( " + users_arr[j].firstname + ' ' + users_arr[j].lastname + " )" );

        discussions[i].members = member_usernames;



        discussions[i].banned_user_ids = d[i].banned_users;
        bu = d[i].banned_users;
        if ( bu.includes(',') )
           bu = bu.split(',');
         else
           bu = [bu];
        banned_user_usernames = [];

        banned_users_arr = [];
        if ( !bu.includes('') )
          banned_users_arr = await User.find().where('_id').in(bu).exec();

        for ( j = 0; j < banned_users_arr.length; j = j + 1 )
          banned_user_usernames.push(banned_users_arr[j].username + " ( " + banned_users_arr[j].firstname + ' ' + banned_users_arr[j].lastname + " )" );

        discussions[i].banned_users = banned_user_usernames;
      }


      res.render('view_admin_discussions', {d: JSON.stringify(discussions), user: req.session.user});
    })();
  }
});




module.exports = router;
