var express = require('express'); // framework
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator=require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport'); // for log in using bcrypt encryption
var request = require('request');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose'); // easier db interaction
var logger = require('morgan');
var handlebars = require('handlebars'); // for the view templates
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')

// LOCAL DB // mongoose.connect('mongodb://0.0.0.0/db');
mongoose.connect('mongodb+srv://apaluza3:123parola123@cluster0.tj8nvpb.mongodb.net/db');


// mongoose.connect('mongodb://adminuser:123456@0.0.0.0/mydb'); - MAYBE FOR THE CLSTR
var db = mongoose.connection;
const axios = require('axios')
// const css_analyzer = require( '@projectwallace/css-analyzer' )

// console.log(css_analyzer)





// console.log("application functions well ok")
console.log("done");
// routes
var routes = require('./routes/index');
var users = require('./routes/users');
var messages = require('./routes/messages');
var discussions = require('./routes/discussions');
var assignments = require('./routes/assignments');

//init app
var app = express();

app.use(express.static(path.join(__dirname, "public")));




app.use(logger('dev'));

app.set('views', path.join(__dirname,'views'));



app.engine('handlebars',  exphbs.engine({defaultLayout:'layout', handlebars: allowInsecurePrototypeAccess(handlebars)}));
app.set('view engine', 'handlebars');



//BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

//set static folder
app.use(express.static(path.join(__dirname, 'public')));

//express session
app.use(session({
  secret:'secret',
  saveUninitialized: true,
  resave:true
}));



// socketio
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// var Message = require('routes/message');


io.on('connection', (socket) => {
  socket.emit("init", "Socket is connected.");

  socket.on('msg', ({discussion_id, text, r, user}) => {

    console.log("GETS TO MSG SOCKET -------------------------------------------------------------------------------------------------------------------------------------------------------------------");
    console.log(discussion_id);
    console.log(text);
    console.log(r);
    console.log(user);

    request.post(
        'http://0.0.0.0:8081/messages/create_message_socket',
        { json: { sender_id: user._id, text: text, discussion: discussion_id, user: user, r: r } },
        function (error, res, body) {
            // if (!error && response.statusCode == 200) {
            //     console.log(body);
            // }
            if ( error )
                console.log(error);


  
            console.log(res.body);

            if ( typeof res.body.banned != 'undefined' )
            {
              // handle banned user
            }

            m = res.body.new_message;

            console.log(m);

            user = res.body.user;
            discussion_id = res.body.discussion_id;
            r = res.body.r;

            for ( i = 0; i < r.length; i = i + 1 )
              if ( r[i].id == discussion_id )
              {
                if ( !r[i].member_ids.includes( user.id ) )
                {
                  r[i].member_ids.push(user.id);
                  r[i].member_names.push(user.firstname + ' ' + user.lastname);
                  r[i].members.push(user.username);
                }

                date = new Date().toISOString();

                // maybe have to replace \n with <br/>
                msg = {id: m._id, source_username: user.username, text: m.text, createdAt: date, updatedAt: date };

                r[i].messages.push(msg);

                // setTimeout(function(){}, 10000); // wait 10s


                io.sockets.emit("updated_r", {r:r});
                break;
              }
            }


        );
  });








  // socket.on('get_updated_json', () => {

  //   request.post(
  //       'http://0.0.0.0:8081/messages/get_r',
  //       { json: { } },
  //       function (error, res, body) {
  //           // if ( error )
  //           //     console.log(error);
  //           io.sockets.emit("get_updated_json_response", {r:res.body.r});
  //       }
  //   );
  // });


//   socket.on('get_updated_user', ({user_id}) => {

//     request.post(
//         'http://0.0.0.0:8081/messages/get_user',
//         { json: { user_id: user_id } },
//         function (error, res, body) {
//             if ( error )
//                 console.log(error);
//             io.sockets.emit("get_updated_user_response", {user:res.body.user});
//         }
//     );
//   });










// socket.on('file_upload', ({ discussion_id, files, r, user }) => {

//     console.log("GETS TO FILE UPLOAD SOCKET -------------------------------------------------------------------------------------------------------------------------------------------------------------------");
//     console.log(discussion_id);
//     console.log(files);
//     console.log(r);
//     console.log(user);

//     request.post(
//         'http://0.0.0.0:8081/messages/file_upload',
//         { json: { sender_id: user._id, files: files, discussion: discussion_id, user: user, r: r } },
//         function (error, res, body) {
//             // if (!error && response.statusCode == 200) {
//             //     console.log(body);
//             // }
//             if ( error )
//                 console.log(error);


  
//             console.log(res.body);

//             // m = res.body.new_message;
//             // user = res.body.user;
//             // discussion_id = res.body.discussion_id;
//             // r = res.body.r;

//             // for ( i = 0; i < r.length; i = i + 1 )
//             //   if ( r[i].id == discussion_id )
//             //   {
//             //     if ( !r[i].member_ids.includes( user.id ) )
//             //     {
//             //       r[i].member_ids.push(user.id);
//             //       r[i].member_names.push(user.firstname + ' ' + user.lastname);
//             //       r[i].members.push(user.username);
//             //     }

//             //     date = new Date().toISOString();

//             //     // maybe have to replace \n with <br/>
//             //     msg = {source_username: user.username, text: m.text, createdAt: date, updatedAt: date };

//             //     r[i].messages.push(msg);

//             //     io.sockets.emit("updated_r", {r:r});
//             //     break;
//             //   }

//         }
//     );


//   });

});





//passport init
app.use(passport.initialize());
app.use(passport.session());


//express validator
app.use(expressValidator({
  errorFormatter:function(param, msg, value){
    var namespace = param.split('.'),
    root = namespace.shift(),
    formParam = root;

    while(namespace.length){
      formParam+='[' + namespace.shift() + ']';
    }
    return{
      param:formParam,
      msg:msg,
      value:value
    };
    }
}));

//connect flash
app.use(flash());

//global vars
app.use(function(req,res,next){
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// define route-path correlations
app.use('/', routes);
app.use('/users', users);
app.use('/messages', messages);
app.use('/discussions', discussions);
app.use('/assignments', assignments);

// set favicon
app.use(favicon(__dirname + '/public/images/logo.png'));


//set port
app.set('port', (process.env.PORT || 8081));

// funciton to handle 404 errors
app.get('*', function(req,res){
url = req.originalUrl;
console.log("gets to the * function");
axios.get(url).catch((error) => {
        if (error.errno == -4078) {
            res.render('404', { previous_url: url });
      } 
    });
});

// app.listen(app.get('port'), function(){
//   console.log('Server restarted on port   '+ app.get('port'));
//   // console.log("css:" + result);
// });

server.timeout = 2147480000;
server.setTimeout(2147480000);

server.listen(8081, "0.0.0.0", function(){
  console.log('Server restarted on port 8081');
  // console.log("css:" + result);
});

server.timeout = 2147480000;
server.setTimeout(2147480000);
