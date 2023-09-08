var express= require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcryptjs');
const session = require('express-session')
var nodemailer = require('nodemailer');
// var random = require('random');
var formidable = require('formidable');
var fs = require('fs');
const path = require('path')
var request = require('request');

// importing required model files
var User = require('../models/user');






// render the user register page
router.get('/register', function(req,res){
  res.render('register');
});

// render the user login page
router.get('/login', function(req,res){

  is_file = true; // check if the application is in maintenance mode
  try  { let stats = fs.statSync(path.join(__dirname, '../') + '\maintenance'); }
  catch (err) { is_file = false; }

  if ( is_file == true )
    res.render('login', {maintenance: true});
  else
    res.render('login');

});

// used to turn the first letter of firstnames and lastnames into an uppercase one
function upper ( a ){ return a.charAt(0).toUpperCase() + a.slice(1); }

//the user sends their registration data though POST (though POST since sensitive data is being sent)
router.post('/register', function(req,res){
var firstname = upper(req.body.firstname);
var lastname = upper(req.body.lastname);
var email = req.body.email;
var username = req.body.username;
var gender = req.body.gender;
var date_of_birth = String(req.body.date_of_birth).substring(0, 10);
var details = req.body.details;
var alias = req.body.alias;
var phone = req.body.phone;


// empty field checks
if ( firstname == "" || lastname == "" || email == "" || username == "" || gender == "" || date_of_birth == "" || details == "" || alias == "" || phone == "" || req.body.password == "" || req.body.password2 == ""  )
{
  registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias ];
  registering_user = JSON.stringify(registering_user);

  return res.render('register', {error: "Please fill in all the fields. Thank you.", registering_user: registering_user, noskip: true });
}

pwd_requirements = false;
pwd_have_upper = false;
pwd_have_length = false;
pwd_have_digit = false;

// password checks
if ( req.body.password.length >= 8 )
  pwd_have_length = true;

for (i = 65; i <= 90; i++) // check if the password has an uppercase letter
  if (req.body.password.includes( String.fromCharCode(i) ))
  {
    pwd_have_upper = true;
    break;
  }
    
for (i = 0; i <= 9; i = i + 1) // check if the password has a digit
  if (req.body.password.includes( String(i) ))
  {
    pwd_have_digit = true;
    break;
  }


if ( pwd_have_length == true && pwd_have_upper == true && pwd_have_digit == true )
  pwd_requirements = true;

if ( pwd_requirements != true ) // tell user their password did not meet requirements
{
  registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias ];
  registering_user = JSON.stringify(registering_user);

  return res.render('register', {error: "Please make sure you met all password requirements. Thank you.", registering_user: registering_user, noskip: true });
}

if ( !email.includes('@') ) // tell users their email did not meet requirements
{
  registering_user = [ firstname, lastname, username, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias ];
  registering_user = JSON.stringify(registering_user);

  return res.render('register', {error: "Email formatted incorrectly.", registering_user: registering_user });
}

// check if the date is valid
if ( new Date(req.body.date_of_birth) > new Date() ) // tell users their end date did not meet requirements
{
  registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias ];
  registering_user = JSON.stringify(registering_user);

  return res.render('register', {error: "The date you entered is incorrect. The current date precedes it.", registering_user: registering_user, noskip: true });
}


if ( req.body.password != req.body.password2 ) // tell users their passwords did not match
{
  registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias ];
  registering_user = JSON.stringify(registering_user);

  return res.render('register', {error: "Passwords do not match.", registering_user: registering_user, noskip: true });
}

(async () => { 


  is_first_user = false; // the first ever user to sign up is always going to be an administrator
  users = await User.find();
  console.log("HERE IS ------------------------------------- users")
  console.log(users)
  if (String(users) == "") // after checking that there are no users alread in the db, the registering user is decided to be the first
    is_first_user = true;

  var u = await User.getUserByEmail(req.body.email) // check the database for a user with the newly updated email
  console.log("u is:");
  console.log(u);

  if (u !== null) // if the email the user wanted to update to is already in use, tell them, send all their form data back to them and ask them to choose another username
  {
    registering_user = [ firstname, lastname, username, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias ];
    registering_user = JSON.stringify(registering_user);

    return res.render('register', {error: "Email already in use! Please choose another email", registering_user: registering_user });
    // send em a message too saying their username was already takeN
  }

  var u = await User.getUserByUsername(req.body.username)
  console.log("u is:");
  console.log(u);
  if (u !== null) // if the username the user wanted to update to is already in use, tell them, send all their form data back to them and ask them to choose another username
  {
    registering_user = [ firstname, lastname, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias ];
    registering_user = JSON.stringify(registering_user);


    return res.render('register', {error: "Username already in use! Please choose another username", registering_user: registering_user });
    // send em a message too saying their username was already taken
  }


const chr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

rand_verifier = "";

for ( i = 0; i < 10; i = i + 1 ) // generating a code to verify the registering user's email with
{
  if (i % 2 == 0)
    rand_verifier = rand_verifier + String( Math.floor(Math.random() * 10) )
  else
    rand_verifier = rand_verifier + chr[Math.floor(Math.random() * chr.length)];
}

var user_email = email; // send the user the email verification they require to be able to login
var subject = "Please verify your account";
var email_text = "<div style='font-size:25px;'>Go to <b>http://0.0.0.0:8081/users/verif_rand:" + rand_verifier + '!' + username + "</b> to verify your account<br><br>Thank you!</div>";

var transporter = nodemailer.createTransport({
service: 'gmail',
auth: {
  user: 'apaluza345@gmail.com',
  pass: 'dnddlxgwhholdqqb' // password provided by the email service provider as an "app password"
}
});

var mailOptions = {
  replyTo: 'apaluza345@gmail.com', // make sure that when replaying, the moderators / admins use the email address entered by the user
  to: user_email,
  subject: subject,
  html: email_text
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});



var password = req.body.password; // user password
var password2 = req.body.password2; // confirmed password

//validation
req.checkBody('firstname', 'Firstname is required').notEmpty();
req.checkBody('lastname', 'Lastname is required').notEmpty();
req.checkBody('email', 'email is required').notEmpty();
req.checkBody('username', 'username is required').notEmpty();
req.checkBody('password', 'password is required').notEmpty();
req.checkBody('password2', 'passwords do not match').equals(req.body.password);

// var errors = req.getValidationResult();

// if(errors){
// const er = new Array(errors)
// const err = new Error(er.map(el => el['msg']).toString());
// err.status = 400;
// console.log(err)
// res.render('register', {
// errors:errors
// });
// } else {

// make a User object that the db can be given to store

usr = { 
  firstname:firstname,
  lastname:lastname,
  email:email,
  username:username,
  password:password,
  gender:gender,
  date_of_birth:date_of_birth,
  details:details,
  alias:alias,
  phone:phone,
  rand_verifier: rand_verifier, 
  type: "regular"
}; 

if (is_first_user == true) // first user is always an admin
  usr.type = "admin";

var newUser = new User(usr);
User.createUser(newUser, function(err,user){ // add user to db
  if(err) throw err;
  console.log(user);
});

oldpath = path.join(__dirname, '../public/images') + '\\' + "default_profile_image"
newpath = path.join(__dirname, '../public/images') + '\\' + username + "_profile_image"

fs.rename(oldpath, newpath, function (err) {
  if (err) throw err;
  console.log('File moved!');
  res.end();
});
  
req.flash('success_msg','You are registered and can now log in.');
return res.render('login', { msg: email }); // tell them to check their email
//}
})()

});

// function passport requires for authentication
passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.getUserById(id, function(err, user){
    done(err, user);
  });
});

// the user logs in (though POST since sensitive data is being sent)
router.post('/login', function(req,res){
  (async () => { 
        var u = await User.getUserByUsername(req.body.username) 

        var m = await User.getUserByEmail(req.body.username) 

        // attempt getting the user though email or password, to see if they are in the db

        if ( u == null && m != null ) // the user is  kept in the u variable even if it was retriever though their unique email
          u = m;

        if ( u == null && m == null ) // user was not found anyhow
        {
          res.render('login', {unrecognised: req.body.username});
          return;
        }


        if ( typeof u.rand_verifier != "undefined" ) // if the user did not verify their email, tell them to
            if ( u.rand_verifier != "verified" )
            {
              res.render('login', {error: u.email});
              return;
            }

        if ( typeof u.banned != "undefined" ) // if the user is banned, tell them they cannot log in
            if ( u.banned == true )
            {
              res.render('login', {banned_email: u.email, banned_username: u.username});
              return;
            }


        console.log(u);

        if (u == null) // if the user is empty, just refresh the page
          res.redirect('/users/login');
        else
        {
          is_file = true; // check if the application is in maintenance mode
          try  { let stats = fs.statSync(path.join(__dirname, '../') + '\maintenance'); }
          catch (err) { is_file = false; }

          if ( is_file == true && u.type != "admin" ) // only let admins log in durin maintenance, so they can uplift the maintenance
          {
            res.redirect('/users/login');
            return;
          }

          const validPassword = await bcrypt.compare(req.body.password, u.password); // comparing the user-entered password with the decrypted db password

          console.log("Passport comparison result: " + validPassword); // used to observe the application behaviour in the server console

          if (validPassword)
          {
            user = { "id": u.id, "username": u.username, "firstname": u.firstname, "lastname": u.lastname, "gender": u.gender, "date_of_birth": u.date_of_birth, "details": u.details, "alias": u.alias, "phone": u.phone, "email": u.email, "theme": u.theme, "themes": u.themes, "accepted_privacypolicy": u.accepted_privacypolicy, "hidden_messages": u.hidden_messages, "censored_words": u.censored_words, "type": u.type }; // prepare the user data to be sent to the UI and put in the session as well

            if ( is_file == true )
              req.session.maintenance = true;
            // fill up session data
            req.session.user_image = user.username + "_profile_image";
            req.session.user = user;
            req.session.user_id = u.id; // keep the user id separate, just so that the log in state can be verified even if no other user data is being send to the ui

            console.log("u.accepted_privacypolicy");
            console.log(u.accepted_privacypolicy);

            if (u.accepted_privacypolicy == true) // only take theuser to their dashboard after they have accepted the privacy policy
              res.redirect('/');
            else
              res.redirect('/privacypolicy');
          }
          else
          {
            res.redirect('/users/login'); // if the password was invalid, the user is kept on the log in page
          }
        }
       })();
});

// the user logs out (there is no view template file for the logout GET request)
router.get('/logout', User.ensureAuthenticated, function(req,res){
  req.session.user = undefined; // log out the user in the back-end
  req.flash('success', 'logout successfull');
  res.redirect('/users/login');
});


// the currently used user theme is being saved to the db on logout, though GET. Even so, this GET is also used for when the user wants to save their current usern theme without logging out
router.get('/logout:a', function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }
console.log("gata")
console.log("done");
  logout = true; 
  arr = req.params.a.slice(1);
  if ( arr[arr.length - 1] == '@' ) // a '@' character is inserted 'before' the string url parameter, to tell the backend if the user wants to log out, or just save their current theme
    logout = false;

  val = arr.split("@"); // the color and difference of color are also divided by a '@' character

  thme = val[0] + "," + val[1]; // formate the theme for the dv

  (async () => {

    var user = req.session.user; // get the user data fromt he session
    var update = {
      theme: thme
    };

    await User.updateUser(update, req.session.user_id, function(err,user){
        if(err) throw err;
          console.log(user);
    });

    user.theme = thme; // update the user for the ui
    req.session.user = user; // and for the session

    res.params = "";

    if (logout) // only logout if the user intends so (this GET request is both on the logout button and on the save_theme button)
    {
      req.session.destroy();
      delete req.session;
      await res.redirect('/users/login');
    }
    else  
      await res.render('index', {user:user});
  })();

});

// render the user edit page
router.get('/edit', User.ensureAuthenticated, function(req,res){
  console.log(req.session.user);
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
    res.render('edit', {user:req.session.user});
});

// the user sends updated user data
router.post('/edit', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  (async () => {

  id = req.session.user_id;


  edited_user = await User.findById(id);
  if ( req.session.user.type != "admin" && edited_user.id != req.session.user_id ) // if the user is trying to edit another user besiddes themselves and they are not an administrato, tell them they do not have the privileges for that
  {
    res.render('index', {user: req.session.user, access_denied: true});
    return;
  }

  var firstname = upper(req.body.firstname);
  var lastname = upper(req.body.lastname);
  var email = req.body.email;
  var username = req.body.username;
  var gender = req.body.gender;
  var date_of_birth = String(req.body.date_of_birth).substring(0, 10);
  var details = req.body.details;
  var alias = req.body.alias;
  var phone = req.body.phone;


  // empty field checks
  if ( firstname == "" || lastname == "" || email == "" || username == "" || gender == "" || date_of_birth == "" || details == "" || alias == "" || phone == "" || req.body.password == "" || req.body.password2 == ""  )
  {
    registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "Please fill in all the fields. Thank you.", registering_user: registering_user, noskip: true, user: req.session.user };

    res.render('edit', data);

    return;
  }

  pwd_requirements = false;
  pwd_have_upper = false;
  pwd_have_length = false;
  pwd_have_digit = false;

  // password checks
  if ( req.body.password.length >= 8 )
    pwd_have_length = true;

  for (i = 65; i <= 90; i++) // check if the password has an uppercase letter
    if (req.body.password.includes( String.fromCharCode(i) ))
    {
      pwd_have_upper = true;
      break;
    }
      
  for (i = 0; i <= 9; i = i + 1) // check if the password has a digit
    if (req.body.password.includes( String(i) ))
    {
      pwd_have_digit = true;
      break;
    }


  if ( pwd_have_length == true && pwd_have_upper == true && pwd_have_digit == true )
    pwd_requirements = true;

  if ( pwd_requirements != true ) // tell the user their password did not meet requirements
  {
    registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "Please make sure you met all password requirements. Thank you.", registering_user: registering_user, noskip: true, user: req.session.user };

    res.render('edit', data);

    return;
  }

  if ( !email.includes('@') ) // tell the user their email did not meet requirements
  {
    registering_user = [ firstname, lastname, username, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "Email formatted incorrectly.", registering_user: registering_user, user: req.session.user };
 
    res.render('edit', data);

    return;
  }

  // check if the date is valid
  if ( new Date(req.body.date_of_birth) > new Date() ) // tell the user their date did not meet requirements
  {
    registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "The date you entered is incorrect. The current date precedes it.", registering_user: registering_user, noskip: true, user: req.session.user };

    res.render('edit', data);

    return;
  }


  if ( req.body.password != req.body.password2 ) // tell the user their passwords did not match
  {
    registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "Passwords do not match.", registering_user: registering_user, noskip: true, user: req.session.user };
 
    res.render('edit', data);

    return;
  }


  console.log("id");
  console.log(id);

  var u = await User.getUserByEmail(req.body.email) // check the database for a user with the newly updated email
  console.log("u is:");
  console.log(u);

  if (u !== null) // if the username the used wanted to update to is already in use, tell them, send all their form data back to them and ask them to choose another username
  {
    if (u.id != id)
    {
      console.log(u.id);
      console.log(req.session.user.id);
    registering_user = [ req.body.firstname, req.body.lastname, req.body.username, req.body.password, req.body.password2, req.body.gender, req.body.date_of_birth, req.body.details, req.body.phone, req.body.alias, id ];
    registering_user = JSON.stringify(registering_user);


    data = {error: "Email already in use! Please choose another email", registering_user: registering_user, user: req.session.user };

    res.render('edit', data);

    return;

    // send em a message too saying their email was already taken
    }
  } 


 var u = await User.getUserByUsername(req.body.username) // check the database for a user with the newly updated username
  console.log("u is:");
  console.log(u);

  if (u !== null) // if the username the used wanted to update to is already in use, tell them, send all their form data back to them and ask them to choose another username
  {
    if (u.id != req.session.user.id && u.id != id)
    {
      console.log(u.id);
      console.log(req.session.user.id);
    registering_user = [ req.body.firstname, req.body.lastname, req.body.email, req.body.password, req.body.password2, req.body.gender, req.body.date_of_birth, req.body.details, req.body.phone, req.body.alias, id ];
    registering_user = JSON.stringify(registering_user);


    data = {error: "Username already in use! Please choose another username", registering_user: registering_user, user: req.session.user };

    res.render('edit', data);
    return;
    // send em a message too saying their username was already taken
    }
  } 


  // if the newly chosen username is available (not in use already)

  var update = {

    firstname: req.body.firstname,
    lastname: req.body.lastname,
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    gender: req.body.gender,
    date_of_birth: req.body.date_of_birth,
    details: req.body.details,
    alias: req.body.alias,
    phone: req.body.phone

  }

  usr = await User.findById(id);

  prev_email = usr.email;

  if ( req.body.email != prev_email ) // if a new email was entered, send the user an email verification to the new email
  {
    const chr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    rand_verifier = "";

    for ( i = 0; i < 10; i = i + 1 ) // generate the code that is going to be used to verify a user account
    {
      if (i % 2 == 0)
        rand_verifier = rand_verifier + String( Math.floor(Math.random() * 10) )
      else
        rand_verifier = rand_verifier + chr[Math.floor(Math.random() * chr.length)];
    }

    var user_email = req.body.email; // send the actual verificaiton email
    var subject = "Please verify your new email";
    var email_text = "<div style='font-size:25px;'>Go to <b>http://0.0.0.0:8081/users/verif_rand:" + rand_verifier + '!' + req.body.username + "</b> to verify your account<br><br>Thank you!</div>";

    var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'apaluza345@gmail.com',
      pass: 'dnddlxgwhholdqqb' // password provided by the email service provider as an "app password"
    }
    });

    var mailOptions = {
      replyTo: 'apaluza345@gmail.com', // make sure that when replaying, the moderators / admins use the email address entered by the user
      to: user_email,
      subject: subject,
      html: email_text
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    update["rand_verifier"] = rand_verifier;
  }

  //validation
  req.checkBody('firstname', 'Firstname is required').notEmpty();
  req.checkBody('lastname', 'Lastname is required').notEmpty();
  req.checkBody('email', 'email is required').notEmpty();
  req.checkBody('username', 'username is required').notEmpty();
  req.checkBody('password', 'password is required').notEmpty();
  req.checkBody('password2', 'passwords do not match').equals(req.body.password);

  console.log("USER ID");
  console.log(req.session.user_id);

  // always have to update the session user too
  req.session.user[ "username" ] = req.body.username;
  req.session.user[ "firstname" ] = req.body.firstname;
  req.session.user[ "lastname" ] = req.body.lastname;
  req.session.user[ "email" ] = req.body.email;
  req.session.user[ "gender" ] = req.body.gender;
  req.session.user[ "date_of_birth" ] = req.body.date_of_birth;
  req.session.user[ "details" ] = req.body.details;
  req.session.user[ "alias" ] = req.body.alias;
  req.session.user[ "phone" ] = req.body.phone;


  User.updateUser(update, req.session.user_id); 

  res.render('index', {user: req.session.user});

  })(); 

});







// an admin is editin the data of other users
router.post('/edit_users', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  (async () => {

  id = req.body.id;


  edited_user = await User.findById(id);
  if ( req.session.user.type != "admin" && edited_user.id != req.session.user_id )
  {
    res.render('index', {user: req.session.user, access_denied: true});
    return;
  }


  if ( typeof req.body.restrictions == 'undefined' ) // the administrators are able to uncheck a checkbox, to disable all restrictions - when a checkbox is disabled, it is not sent to the backend, so it is 'undefined'
  {
    var update = {

      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      gender: req.body.gender,
      date_of_birth: req.body.date_of_birth,
      details: req.body.details,
      alias: req.body.alias,
      phone: req.body.phone

    }

    User.updateUser(update, id); 

    res.redirect('edit_users:');
  }

  var firstname = upper(req.body.firstname);
  var lastname = upper(req.body.lastname);
  var email = req.body.email;
  var username = req.body.username;
  var gender = req.body.gender;
  var date_of_birth = String(req.body.date_of_birth).substring(0, 10);
  var details = req.body.details;
  var alias = req.body.alias;
  var phone = req.body.phone;


  // empty field checks
  if ( firstname == "" || lastname == "" || email == "" || username == "" || gender == "" || date_of_birth == "" || details == "" || alias == "" || phone == "" || req.body.password == "" || req.body.password2 == ""  )
  {
    registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "Please fill in all the fields. Thank you.", registering_user: registering_user, noskip: true, user: req.session.user };

    data.users = users;
    res.render('edit_users', data);
    return;
  }

  pwd_requirements = false;
  pwd_have_upper = false;
  pwd_have_length = false;
  pwd_have_digit = false;

  // password checks
  if ( req.body.password.length >= 8 )
    pwd_have_length = true;

  for (i = 65; i <= 90; i++) // check if the password has an uppercase letter
    if (req.body.password.includes( String.fromCharCode(i) ))
    {
      pwd_have_upper = true;
      break;
    }
      
  for (i = 0; i <= 9; i = i + 1) // check if the password has a digit
    if (req.body.password.includes( String(i) ))
    {
      pwd_have_digit = true;
      break;
    }


  if ( pwd_have_length == true && pwd_have_upper == true && pwd_have_digit == true )
    pwd_requirements = true;

  if ( pwd_requirements != true ) // tell the user their password did not meet requirements
  {
    registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "Please make sure you met all password requirements. Thank you.", registering_user: registering_user, noskip: true, user: req.session.user };

    data.users = users;
    res.render('edit_users', data);
    return;
  }

  if ( !email.includes('@') ) // tell the user their email did not meet requirements
  {
    registering_user = [ firstname, lastname, username, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "Email formatted incorrectly.", registering_user: registering_user, user: req.session.user };
 
    data.users = users;
    res.render('edit_users', data);
    return;
  }

  // check if the date is valid
  if ( new Date(req.body.date_of_birth) > new Date() ) // tell the user their date did not meet requirements
  {
    registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "The date you entered is incorrect. The current date precedes it.", registering_user: registering_user, noskip: true, user: req.session.user };

    data.users = users;
    res.render('edit_users', data);
    return;
  }


  if ( req.body.password != req.body.password2 ) // tell the user their passwords did not match
  {
    registering_user = [ firstname, lastname, username, email, req.body.password, req.body.password2, gender, req.body.date_of_birth, details, phone, alias, id ];
    registering_user = JSON.stringify(registering_user);

    data = {error: "Passwords do not match.", registering_user: registering_user, noskip: true, user: req.session.user };
 
    data.users = users;
    res.render('edit_users', data);
    return;
  }


  console.log("id");
  console.log(id);

  var u = await User.getUserByEmail(req.body.email) // check the database for a user with the newly updated email
  console.log("u is:");
  console.log(u);

  if (u !== null) // if the username the used wanted to update to is already in use, tell them, send all their form data back to them and ask them to choose another username
  {
    if (u.id != id)
    {
      console.log(u.id);
      console.log(req.session.user.id);
    registering_user = [ req.body.firstname, req.body.lastname, req.body.username, req.body.password, req.body.password2, req.body.gender, req.body.date_of_birth, req.body.details, req.body.phone, req.body.alias, id ];
    registering_user = JSON.stringify(registering_user);


    data = {error: "Email already in use! Please choose another email", registering_user: registering_user, user: req.session.user };

    data.users = users;
    res.render('edit_users', data);
    return;

    // send em a message too saying their email was already taken
    }
  } 


 var u = await User.getUserByUsername(req.body.username) // check the database for a user with the newly updated username
  console.log("u is:");
  console.log(u);

  if (u !== null) // if the username the used wanted to update to is already in use, tell them, send all their form data back to them and ask them to choose another username
  {
    if (u.id != req.session.user.id && u.id != id)
    {
      console.log(u.id);
      console.log(req.session.user.id);
    registering_user = [ req.body.firstname, req.body.lastname, req.body.email, req.body.password, req.body.password2, req.body.gender, req.body.date_of_birth, req.body.details, req.body.phone, req.body.alias, id ];
    registering_user = JSON.stringify(registering_user);


    data = {error: "Username already in use! Please choose another username", registering_user: registering_user, user: req.session.user };

    data.users = users;
    res.render('edit_users', data);
    return;
    // send em a message too saying their username was already taken
    }
  } 


  // if the newly chosen username is available (not in use already)

  var update = {

    firstname: req.body.firstname,
    lastname: req.body.lastname,
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    gender: req.body.gender,
    date_of_birth: req.body.date_of_birth,
    details: req.body.details,
    alias: req.body.alias,
    phone: req.body.phone

  }



  usr = await User.findById(id);

  prev_email = usr.email;

  if ( req.body.email != prev_email ) // is a new email was chosen, verify it
  {
    const chr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    rand_verifier = "";

    for ( i = 0; i < 10; i = i + 1 ) // generate verificaiton code
    {
      if (i % 2 == 0)
        rand_verifier = rand_verifier + String( Math.floor(Math.random() * 10) )
      else
        rand_verifier = rand_verifier + chr[Math.floor(Math.random() * chr.length)];
    }

    var user_email = req.body.email; // send the actual verification email
    var subject = "Please verify your new email";
    var email_text = "<div style='font-size:25px;'>Go to <b>http://0.0.0.0:8081/users/verif_rand:" + rand_verifier + '!' + req.body.username + "</b> to verify your account<br><br>Thank you!</div>";

    var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'apaluza345@gmail.com',
      pass: 'dnddlxgwhholdqqb' // password provided by the email service provider as an "app password"
    }
    });

    var mailOptions = {
      replyTo: 'apaluza345@gmail.com', // make sure that when replaying, the moderators / admins use the email address entered by the user
      to: user_email,
      subject: subject,
      html: email_text
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    update["rand_verifier"] = rand_verifier;
  }

  //validation
  req.checkBody('firstname', 'Firstname is required').notEmpty();
  req.checkBody('lastname', 'Lastname is required').notEmpty();
  req.checkBody('email', 'email is required').notEmpty();
  req.checkBody('username', 'username is required').notEmpty();
  req.checkBody('password', 'password is required').notEmpty();
  req.checkBody('password2', 'passwords do not match').equals(req.body.password);

  console.log("USER ID");
  console.log(req.session.user_id);

  User.updateUser(update, id); 

  res.redirect('edit_users:');

  })(); 

});





// delete the logged in user
router.get('/delete', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    (async () => {

    users = await User.find();

    have_another_admin = false; // if an admin wants to delete themselves, they are only allowed if there is at least another admin to take their place
    for ( i = 0; i < users.length; i = i + 1 )
      if ( typeof users[i].type != 'undefined' )
        if ( users[i].type == "admin" && users[i].id != req.session.user_id )
        {
          have_another_admin = true;
          break;
        }


    if ( have_another_admin == false )
    {
      res.render('index', {user:req.session.user, only_admin: true});
      return;
    }


    User.deleteUser(req.session.user_id);
    res.redirect('/users/login');
    })(); 
  }
});

// view a user
router.get('/view_user:a', User.ensureAuthenticated, function(req,res){
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

    u = await User.findById(id);

    console.log(u);

    res.render('view_user', {user:req.session.user, u: u});
    })();

  }
});


// verify the verification code sent to the user's email when they signed up
router.get('/verif_rand:a', function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }
    (async () => {

    rand = req.params.a.slice(1).split('!');
    verifier = rand[0];
    username = rand[1];


    console.log("LOOK HERE FOR RAND -----------");
    console.log(rand);
    console.log(verifier);
    console.log(username);

    u = await User.getUserByUsername(username);

    if ( typeof u.id != 'undefined' ) // the user was found, and it is not updated
    {
      update = { rand_verifier: "verified" };

      await User.updateUser( update, u.id );
      res.render('login', { success: username });
    }
    else
      res.render('login', { issue: username });
    })();

  
});



// edit users
router.get('/edit_users:a', User.ensureAdmin, function(req,res){
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
    edit_user_id = req.params.a.slice(1);

    users = await User.find(); // selects all users from the database, so as to let the logged in user include them in a newly created assignment

    users = JSON.stringify(users); // ONLY send data to the frontend as strings

    if ( edit_user_id == "" )
      edit_user_id = req.session.user_id;

    res.render('edit_users', { user_id: req.session.user_id, user: req.session.user, users: users, edit_user_id: edit_user_id });
    })();
  }
});

// change password if the user forgets it
router.get('/forgot_password:a', function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }
    (async () => {

    username_or_email = req.params.a.slice(1);

    console.log("LOOK HERE FOR username_or_email -----------");
    console.log(username_or_email);

    u = await User.getUserByUsername(username_or_email);

    m = await User.getUserByEmail(username_or_email);

    // the user can enter their email or their username to be able to reset their password and get an email with it

    if ( u == null && m != null ) // keep user in the 'u' variable
      u = m;

    if ( typeof u.id != 'undefined' )
    {
      const chr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

      rand_verifier = "";

      for ( i = 0; i < 10; i = i + 1 ) // generate the verification code
      {
        if (i % 2 == 0)
          rand_verifier = rand_verifier + String( Math.floor(Math.random() * 10) )
        else
          rand_verifier = rand_verifier + chr[Math.floor(Math.random() * chr.length)];
      }

      update = { password: rand_verifier };

      var user_email = u.email; // actually email the user with their login data
      console.log("HERE user_email");
      console.log(user_email);
      var subject = "Here is your new password";
      var email_text = "<table style='font-size:25px;'><tr><td>Your username is:</td><td><b>" + u.username + "</b></td></tr><tr><td>Your password is:</td><td><b>" + rand_verifier + "</b></td></tr><tr style=\"font-size: 17px;\"><td colspan=2>You may <b>change</b> password after log in.<br/>Thank you.</td></tr></table>";

      var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'apaluza345@gmail.com',
        pass: 'dnddlxgwhholdqqb' // password provided by the email service provider as an "app password"
      }
      });

      var mailOptions = {
        replyTo: 'apaluza345@gmail.com', // make sure that when replaying, the moderators / admins use the email address entered by the user
        to: user_email,
        subject: subject,
        html: email_text
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      console.log(u);

      await User.updateUser( update, u.id );
      res.render('login', { forgot: u.email });
    }
    else
      res.render('login', { issue: username });
    })();

  
});


// render the censored words page
router.get('/view_censored_words', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
    res.render('view_censored_words', {user: JSON.stringify(req.session.user)});
});

// view / add / remove censored words
router.post('/view_censored_words', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    (async () => {
    censored_words = req.body.censored_words.replace(/\r\n/g,'<br/>');

    while ( censored_words.includes("<br/><br/>") ) // remove empty rows
      censored_words.replaceAll("<br/><br/>", "<br/>");

    update = { censored_words, censored_words };

    await User.updateUser(update, req.session.user_id); // update the user in the db

    req.session.user["censored_words"] = censored_words; // update the user in the session

    console.log(req.session.user);

    res.render('view_censored_words', {user:JSON.stringify(req.session.user)});
    })();
  }
});


// an admin wasnts to delete a user thought POST
router.post('/delete_user', User.ensureAdmin, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    (async () => {
    id = req.body.delete_user_select;

    console.log("DELETE id");
    console.log(id);

    if ( id == req.session.user_id ) // an admin wanted to delete themselves
    {
      res.redirect('/users/delete');
      return;
    }

    await User.deleteUser(id);

    res.redirect('edit_users:');
    })();
  }
});

// an admin wants to delete a user thought GET
router.get('/delete_user:a', User.ensureAdmin, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    (async () => {
    id = req.params.a.slice(1);

    console.log("DELETE id");
    console.log(id);

    if ( id == req.session.user_id ) // an admin wanted to delete themselves
    {
      res.redirect('/users/delete');
      return;
    }

    await User.deleteUser(id);

    res.redirect('edit_users:');
    })();
  }
});


// an admin wants to ban / unban a user from the whole platform
router.post('/ban_user', User.ensureAdmin, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    id = req.body.ban_user_select;

    ban = true; // decide if the user is banned or not and change their banned status
    if ( id.includes("!banned") )
    {
      ban = false;
      id = id.slice(0, -7)
    }

    update = { banned: ban };

    User.updateUser(update, id); // update the user

    res.redirect('edit_users:');
  }
});

// a user wants to upload a profile image
router.post('/upload_profile_image', User.ensureAuthenticated, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    var form = new formidable.IncomingForm();

    form.parse(req, function (err, fields, files) {

    filename = files.image[0].originalFilename;

    var oldpath = files.image[0].filepath;

    newpath = path.join(__dirname, '../public/images') + '\\' + req.session.user.username + "_profile_image"

    ext = ""
    ext = filename.split('.')[1];
    if ( ext != "" ) // restrict extensions to '.png' and '.jpg' - should be replaced with an actual file-parsing function that really determines if the contents of the file represent the data that an image would contain
      if ( ext != "png" && ext != "jpg"  )
      {
        res.redirect('/users/edit');
        return;
      }

    fs.rename(oldpath, newpath, function (err) { // upload the file to the server
      if (err) throw err;
      console.log('File uploaded and moved!');
      res.redirect('/users/edit');
    });
    
    });
  }
});

// user wants to remove their profile image
router.get('/delete_profile_image:a', User.ensureAuthenticated, function(req,res){
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
    username = req.params.a.slice(1);

    filepath = path.join(__dirname, '../public/images') + '\\' + username + "_profile_image"; // generate the filename of the profile image for the given username

    fs.unlink(filepath, (err) => { // delete the profile image
      if (err) throw err;
      console.log('path/file.txt was deleted');
    }); 

    res.redirect('edit');
    })();
  }
});


// enables adnimistrators to view all the users in a table and edit them as well
router.get('/view_admin_users', User.ensureAdmin, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    (async () => {

      u = await User.find(); // get all users
      users = []

      for (i = 0; i < u.length; i = i + 1) // send all the users ot the ui as well
      {
        users.push({});
        users[i].id = u[i].id;
        users[i].username = u[i].username;
        users[i].firstname = u[i].firstname;
        users[i].lastname = u[i].lastname;
        users[i].email = u[i].email;
        users[i].gender = u[i].gender;
        users[i].date_of_birth = u[i].date_of_birth;
        users[i].alias = u[i].alias;
        if ( typeof u[i].type != 'undefined' )
          users[i].type = u[i].type;
        if ( typeof u[i].banned != 'undefined' )
         users[i].banned = u[i].banned;
      }

      res.render('view_admin_users', {u: JSON.stringify(users), user: req.session.user});
    })();
  }
});

// an administrator wants to change the type of a user from an view_admin_users page
router.get('/change_type:a', User.ensureAdmin, function(req,res){
  if (req.session.user == undefined) // verify that the user is logged in
    res.redirect('/users/login');
  else
  {
    if ( req.session.user.type != "admin" )
    {
      res.render("index", {user: req.session.user, permission_denied: true});
      return;
    }


    (async () => {
      arr = req.params.a.slice(1).split('!');

      id = arr[0]; // the user id
      type = arr[1]; // the type the admin wants to change the user to ( regular / moderator / admin )

      users = await User.find();

      have_another_admin = false; // the admin is only allowed to delete themselves if there is at least another admin to take their place
      for ( i = 0; i < users.length; i = i + 1 )
        if ( typeof users[i].type != 'undefined' )
          if ( users[i].type == "admin" && users[i].id != id )
          {
            have_another_admin = true;
            break;
          }

      console.log("have_another_admin");
      console.log(have_another_admin);

      if ( have_another_admin == false ) // tell the admin they cannot delete themselves until they give another user admin privileges
      {
        u = await User.find(); // have to get all users in order to render the page, just to send the user a message telling them why they cannot delete themselves
        users = []

        for (i = 0; i < u.length; i = i + 1) // send all the users ot the ui as well
        {
          users.push({});
          users[i].id = u[i].id;
          users[i].username = u[i].username;
          users[i].firstname = u[i].firstname;
          users[i].lastname = u[i].lastname;
          users[i].email = u[i].email;
          users[i].gender = u[i].gender;
          users[i].date_of_birth = u[i].date_of_birth;
          users[i].alias = u[i].alias;
          if ( typeof u[i].type != 'undefined' )
            users[i].type = u[i].type;
          if ( typeof u[i].banned != 'undefined' )
           users[i].banned = u[i].banned;
        }

        res.render('view_admin_users', {u: JSON.stringify(users), user: req.session.user, only_admin: true});
        return;
      }

      u = await User.findById(id);

      update = { type: type }

      await User.updateUser(update, id); // update the user to change their type

      res.redirect("/users/view_admin_users");
    })();
  }
});

module.exports = router;
