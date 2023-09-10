var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
console.log("done");
// user schema
var UserSchema = mongoose.Schema({
  username:{ // unique to each user
    type:String,
    index:true
  },
  password: { // encrypted
    type:String
  },
  email:{ // string checked to have a @ character
    type:String
  },
  firstname:{ // unique to each user - should have the first alphabetic character uppercase
    type:String
  },
  lastname:{ // should have the first alphabetic character uppercase
    type:String
  },
  gender:{
    type:String    
  }, 
  date_of_birth:{ // yyyy-mm-dd
    type:String    
  }, 
  details:{ // multi-line string encoded with <br/> as newline separators
    type:String    
  }, 
  alias:{ // shown on the user dashboard (only functionlaity as for now)
    type:String    
  }, 
  phone:{
    type:String    
  }, 
  type:{ // admin / moderator / empty (undefined) = regular
    type:String
  },
  theme:{ // stores the currently applied user theme
    type:String
  },
  themes:{ // stores all the custom user themes that the user made
    type:String
  },
  accepted_privacypolicy:{ // users are only allowed to get to their dashboard after they accepted the privacy policy
    type:Boolean
  },
  hidden_messages: // array of message ids
  {
    type:String
  },
  rand_verifier: // a verifier generated to check the user's email
  {
    type:String
  },
  censored_words: // comma-separated 
  {
    type:String
  },
  banned: // true / false / non-existent
  {
    type:Boolean
  }  
});
console.log("done");
// connect the scheme to the db model
var User = module.exports = mongoose.model('User', UserSchema);

// importing other required models
var Message = require('./message');
var Assignment = require('./assignment');
var Discussion = require('./discussion');

// create a user while encrypting their password
module.exports.createUser = function(newUser, callback){
  bcrypt.genSalt(10, function(err, salt){
    bcrypt.hash(newUser.password, salt, function(err, hash){
      newUser.password = hash;
      newUser.save();
    });
  });
}

// update the user
module.exports.updateUser = function(update, user_id, callback){
  (async () => {
    // no clue is this actually does what it should
    if ( typeof update.password != 'undefined' )
    {
      console.log("gets here pwd hash")
      console.log(user_id);
      bcrypt.genSalt(10, function(err, salt){
        bcrypt.hash(update.password, salt, function(err, hash){
          (async () => {
            update.password = hash;
            console.log("hash");
            console.log(hash);
            console.log(update.password);
            await User.findOneAndUpdate({_id: user_id}, update);
          })()
        });
      });
      return;
    }
    await User.findOneAndUpdate({_id: user_id}, update);
  })()
}
console.log("done");
// delete the user
module.exports.deleteUser = function(user_id, callback){
  (async () => {
  id = user_id;
  deleted_username = await User.findById(id).username;
    
  filepath = path.join(__dirname, '../public/images') + '/' + deleted_username + "_profile_image"; // generate the filename of the profile image for the given username
  fs.unlink(filepath, (err) => { // delete the profile image
    if (err) console.log( err );
    console.log('path/file.txt was deleted');
  }); 

  await User.findByIdAndRemove(user_id);

    // users should normally just hide users/messages/topics/assignments/discussions, for example by adding a "hidden": true attribute to the db - that functionality has not yet been implemented, so, fow now, users are deleted eprmanently along with all their data 

  // an alternative to "hiding" a user to terminate their account in a way is banning them, which has the same functionality - however, that has to be performed by an admin

  // remove the user id from all discussions
  d = await Discussion.find();

  // remake the arrays of member and banned_users ids to remove the id of the deleted user from very discussions
  for ( i = 0; i < d.length; i = i + 1 )
  {
    if ( d[i].members.includes(id) )
    {
      console.log("DELETE GETS HERE")

      new_m = d[i].members.replaceAll(id, "");

      if ( new_m[0] == ',' )
        new_m = new_m.slice(1);
      if ( new_m[new_m.length - 1] == ',' )
        new_m = new_m.slice(0, -1);

      update = { members: new_m }

      console.log(new_m)

      Discussion.updateDiscussion(update, d[i].id);
    }
    if ( d[i].banned_users.includes(id) )
    {
      console.log("DELETE GETS HERE")

      new_bu = d[i].banned_users,replaceAll(id, "");

      if ( new_bu[0] == ',' )
        new_bu = new_bu.slice(1);
      if ( new_bu[new_bu.length - 1] == ',' )
        new_bu = new_bu.slice(0, -1);

      update = { banned_users: new_bu }

      console.log(new_bu)

      Discussion.updateDiscussion(update, d[i].id);
    }
  }


  // remove the user id from all messages (meaning all the messages the user sent need be deleted)
  await Message.deleteMany({ sender_id: id });
  // m = await Message.find();

  // for ( i = 0; i < m.length; i = i + 1 )
  //   if ( m[i].sender_id == id )
  //     Message.deleteMessage(m[i].id);


    
  // remove the user from assignments
  a = await Assignment.findAssignments();

  // remake the array of assigned_users ids to remove the id of the deleted user from very assignment
  for ( i = 0; i < a.length; i = i + 1 )
    if ( a[i].users_assigned.includes(id) )
    {
      new_u = a[i].users_assigned.replaceAll(id, "");

      if ( new_u[0] == ',' )
        new_u = new_u.slice(1);
      if ( new_u[new_u.length - 1] == ',' )
        new_u = new_u.slice(0, -1);

      update = { users_assigned: new_u }

      Assignment.updateAssignment(update, a[i].id);
    }

  })()
}
// get a user by their username (which is unique)
module.exports.getUserByUsername = async function(username, callback){
  var query = {username:username};
  const user = await User.findOne(query);

  return user;
}

// get a user by their email (which is unique)
module.exports.getUserByEmail = async function(email, callback){
  var query = {email:email};
  const user = await User.findOne(query);

  return user;
}

// get a user by their unique id
module.exports.getUserById = function(id, callback){
  User.findById(id);
}

// module.exports.getUser = function(id, callback){
//   (async () => {
//   return await User.findById(id);
//   })()
// }

// returns all the users
module.exports.getUsers = function(callback){
  User.find();
}

// make sure that the user is authenticated
module.exports.ensureAuthenticated = function(req,res,next){
  if(req.session.user != null)
    return next();
  else 
    res.redirect('/users/login');
}

// make sure that the user an authenticated moderator
module.exports.ensureModerator = function(req,res,next){
  if ( req.session.user == null )
  {
    res.redirect('/users/login');
    return;
  }

  if(req.session.user.type != "regular")
    return next();
  else
    res.render('index', {user: req.session.user, access_denied: true});
}

// make sure that the user an authenticated admin
module.exports.ensureAdmin = function(req,res,next){
  if ( req.session.user == null )
  {
    res.redirect('/users/login');
    return;
  }

  if(req.session.user.type == "admin")
    return next();
  else
    res.render('index', {user: req.session.user, access_denied: true});
}
