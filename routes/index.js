var express= require('express');
var nodemailer= require('nodemailer');
var router = express.Router();
var fs = require('fs');
const path = require('path')
const axios = require('axios')

var User = require('../models/user');


function check_maintenance ()
{
  is_file = true;
  try  { let stats = fs.statSync(path.join(__dirname, '../') + '\maintenance'); }
  catch (err) { is_file = false; }
  console.log(is_file)
  return is_file;
}

router.get('*', function(req,res,next){
  if ( check_maintenance() == true && !req.originalUrl.includes("/users/login") && typeof req.session.user == 'undefined' )
    res.render('maintenance');
  else
    next();
});

// router.get('*', function(req,res,next){
// url = req.originalUrl;
// console.log("gets to the * function");
// axios.get(url).catch((error) => {
//         if (error.errno == -4078) {
//             res.render('404', { previous_url: url });
//       }
//       else
// 	next()
//     });
// });


// get the user dashboard
router.get('/', User.ensureAuthenticated, function(req,res){
  user = req.session.user;


  if (user.accepted_privacypolicy == true) // only allow the user use the applciation though their dashboard after accepting the privacy policy
  {
    if ( req.session.maintenance == true )
      res.render('index', {user:user, maintenance: true});
    else
      res.render('index', {user:user});
  }
  else
    res.redirect('/privacypolicy');

});

// function for toggling maintenance mode
router.get('/toggle_maintenance', User.ensureAdmin, function(req,res,next){
  if ( check_maintenance() == true )
  {
    delete req.session.maintenance;
    fs.unlink(path.join(__dirname, '../') + '\maintenance', (err => {
      if (err) 
        console.log(err);
      else
        console.log("\nDeleted maintenance file");
  })); // delete the "maintenance" file
  }
  else
  {
    req.session.maintenance = true;
    fs.writeFileSync(path.join(__dirname, '../') + '\maintenance', "This file indicates that the website is under maintenance. Deleting it takes the website out of maintenance mode. Creating it manually put the website into maintenance mode."); // create the "maintenance" file
  }
    res.redirect('/');
});


// data being sent though GET, thought a virtual view (that has no view template file), since othervise the / filepath is confused with the index view temaplate
router.get('/virtual:a', User.ensureAuthenticated, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  (async () => {
    user = req.session.user;
    // user = await User.findById(req.session.user_id);

    console.log(req.params.a);

    // if (req.params.a.length >= 12 || req.params.a == "favicon.ico") // prevent any illegal arguments to be passed though GET
    //   return res.render('index', {user:user}); 

    get = req.params.a.slice(1);

    if (get[0] == '@') // identify that the GET request is destined for a user theme deletion
    {
      if (user.themes == undefined || user.themes == "") // if the user has no themes
        return res.render('index', {user:user});

      iter = Number( get[1] );
      console.log(iter);

      thme = user.themes;
      if (thme.includes("&")) // the structure in which user themes are stored is: color,difference&color,difference&color,difference&color,difference meaning not more than 4 themes are allowed per user (besides the theme stored in the user.theme field)
      {
        thme = thme.split('&');

        new_thme = ""
        for (i = 0; i < thme.length; i = i + 1)
        {
          if (i == iter)
            continue;
          new_thme = new_thme + thme[i];
          if (i != thme.length - 1 && ( thme[i + 1] != undefined ) ) 
            new_thme = new_thme + "&";
        }
      }
      else
      {
        if ( iter == 0 ) // user only has one theme that they want to delete, lets delete it
          new_thme = "";
      }

      if ( new_thme[0] == '&' )
        new_thme = new_thme.slice(1);
      if ( new_thme[new_thme.length - 1] == '&' )
        new_thme = new_thme.slice(0, -1);

      user.themes = new_thme;
      req.session.user = user;

      var update = {
        themes: user.themes
      };

      await User.updateUser(update, req.session.user_id, function(err,user){
          if(err) throw err;
            console.log(user);
      });

      return res.render('index', {user:user}); 
    }


	// from here on, the GET request is assumed to be about adding a user theme to the db, since it is the only operation that is performed though GET at this point


    k = req.params.a.split("&");
    tc = k[0].slice(1);
    diff = k[1];

    console.log("GETS HERE ============================================================");

    console.log(k);
    console.log(tc);
    console.log(user.themes);

    if (user.themes == undefined || user.themes == "") // if the user has no previously saved themes
    {
      new_thme = tc + "," + diff

      if ( new_thme[0] == '&' )
        new_thme = new_thme.slice(1);
      if ( new_thme[new_thme.length - 1] == '&' )
        new_thme = new_thme.slice(0, -1);

      user.themes = new_thme;
      user.theme = new_thme;
      req.session.user = user;

      var update = {
        themes: new_thme,
        theme: new_thme
      };

      await User.updateUser(update, req.session.user_id, function(err,user){
          if(err) throw err;
            console.log(user);
      });

      return res.render('index', {user:user});
    }
    else
    {
		thme = user.themes;
		if (thme.includes("&")) // if user has more than one saved theme
		{
		  thme = thme.split('&');

		  console.log("GETS HERE ALRIGHT"); // such print commands are used to make sure the application gets to this portion of the code
		  console.log(thme.length);

		  if (thme.length == 4) // the maximum amount of user themes is attained
		  {
		    for (i = 1; i < thme.length; i = i + 1) // remove the oldest theme and add the newes one
		      thme[i - 1] = thme[i];

		    thme[thme.length - 1] = tc + "," + diff;

		  }
		  else
		    thme.push( tc + "," + diff ); // if th euser has less than 4 saved themes, jsut add the new theme to an array, to then turn it into a string

		  new_thme = ""
		  for (i = 0; i < thme.length; i = i + 1) // turn the array of themes into a string that can be saved in the database
		  {
		    new_thme = new_thme + thme[i];
		    if (i != thme.length - 1)
		      new_thme = new_thme + "&";
		  }
		}
		else
		  new_thme = thme + "&" + tc + "," + diff; // user has only one previously saved theme

		var update = {
		  themes: new_thme,
		  theme: tc + "," + diff
    };

    if ( new_thme[0] == '&' )
      new_thme = new_thme.slice(1);
    if ( new_thme[new_thme.length - 1] == '&' )
      new_thme = new_thme.slice(0, -1);
    
    await User.updateUser(update, req.session.user_id, function(err,user){
        if(err) throw err;
          console.log(user);
    });

    user.themes = new_thme;
    user.theme = tc + "," + diff; // save the newly added user theme as the current user theme
    req.session.user = user;

    console.log(user);

    return res.render('index', {user:user});
    }
  })();
});

// render the help page
router.get('/help', function(req,res){
  res.render('help', {user:req.session.user});
});

// render the contact page
router.get('/contact', function(req,res){
  res.render('contact', {user:req.session.user});
});

// user sends an email though the contact page
router.post('/contact', function(req,res){
  var user_email = req.body.email;
  console.log(user_email);
  var subject = req.body.subject;
  var email_text = req.body.text;

  var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'apaluza345@gmail.com',
    pass: 'dnddlxgwhholdqqb' // password provided by the email service provider as an "app password"
  }
  });

  var mailOptions = {
    replyTo: user_email, // make sure that when replaying, the moderators / admins use the email address entered by the user
    to: 'apaluza345@gmail.com',
    subject: subject,
    text: email_text
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

  res.render('contact', {user:req.session.user});
});

// render the about page
router.get('/about', function(req,res){
  res.render('about', {user:req.session.user});
});

// render the 404 page
router.get('/404', function(req,res){
  res.render('404', {user:req.session.user});
});

// render the privacypolicy page
router.get('/privacypolicy', function(req,res){
  res.render('privacypolicy', {user:req.session.user});
});

// a request sent though GET, referring to the ser accepting the privacy policy
router.get('/privacypolicy:a', User.ensureAuthenticated, function(req,res){
  if ( !req.params.a.includes(':') )
  {
    res.redirect('/');
    return;
  }

  if (req.params.a == ":accept") // all the get parameters use ':' as a starting character
  {
    (async () => {

      var user = req.session.user;
      var update = {
        accepted_privacypolicy: true
      };

      User.updateUser(update, req.session.user_id, function(err,user){
          if(err) throw err;
            console.log(user);
      });

      user.accepted_privacypolicy = true; // always save the changes to the session, so that the signed in used does not have to be retrieved from the db
      req.session.user = user;

      await res.redirect('/');
    })();
  }
});

// render the licence page
router.get('/licence', function(req,res){
  res.render('licence', {user:req.session.user});
});

// render the conditions page
router.get('/conditions', function(req,res){
  res.render('conditions', {user:req.session.user});
});

// render the admin email page
router.get('/admin_email', User.ensureAdmin, function(req,res){
    (async () => {

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


    res.render('admin_email', {users:users});
  })();
});

// admin sends emails to multiple users
router.post('/admin_email', User.ensureAdmin, function(req,res){
  (async () => {
  var ids = req.body.ids.split(',');
  var subject = req.body.subject;
  var email_text = req.body.text;

  emails = [];
  for ( i = 0; i < ids.length; i = i + 1 ) // get users that have to be sent the email
  {
    u = await User.findById(ids[i]);

    emails.push(u.email);
  }

  var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'apaluza345@gmail.com',
    pass: 'dnddlxgwhholdqqb' // password provided by the email service provider as an "app password"
  }
  });



  var mailOptions = {
    replyTo: "apaluza345@gmail.com", // make sure that when replaying, the moderators / admins use the email address entered by the user
    to: emails,
    subject: subject,
    text: email_text
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
      console.log(emails);

     }
  });

 
    u = await User.find(); // selects all users from the database, so as to let the logged in user include them in a newly created discusssion (assuming the admin might want to send another email) - this is done because use admin needs to be sent confirmation that their email is sent, which can only be done using the "render" funciton, not the "redirect" fucntion - the "render" funcition requires all users to be sent to the UI

    users = []

    for (i = 0; i < u.length; i = i + 1) // object relational mapping as it were
    {
      users.push({});
      users[i].id = u[i].id;
      users[i].username = u[i].username;
      users[i].name = u[i].firstname + ' ' + u[i].lastname;
    }

    users = JSON.stringify(users); // ONLY send data to the frontend as strings

      res.render('admin_email', {user:req.session.user, sent: true, users: users}); 
  })();

});

module.exports = router;
