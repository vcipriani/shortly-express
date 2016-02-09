var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var config = require('./config');
var request = require('request');
var qs = require('query-string');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

var redirectUri = 'http://localhost:4568/githubLogin';

// var state = 'lasvlnasdf';
var gitHubUrl = 'https://github.com/login/oauth/authorize?client_id='+config.clientId;

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));

app.restrict = function (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
};

app.get('/', app.restrict, function(req, res) {
  res.render('index');
});

app.get('/create', app.restrict, function(req, res) {
  res.render('index');
});

app.get('/githubLogin', function(req, res) {
  var postParams =  {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: req.query.code
  };

  request.post({url: 'https://github.com/login/oauth/access_token', form:postParams}, 
    function(err, httpResponse, body) {
      var accessToken = qs.parse(body).access_token;
      if (accessToken) {
        var login;
        var id;
        var getParams = {
          uri:'https://api.github.com/user?access_token='+accessToken,
          method: 'GET',
          headers: {'User-Agent': 'Shortly App'}
        };

        request(getParams, function(error, response, body) {
          login = JSON.parse(body).login;
          id = JSON.parse(body).id;
          new User({ githubLogin: login}).fetch().then(function(foundUser) {
            if (foundUser) {
              req.session.regenerate(function(err) {
                req.session.user = login;
                res.redirect('/');
              });              
            } else {
              Users.create({
                githubLogin: login,
                githubId: id,
              })
              .then(function(newUser) {
                req.session.regenerate(function(err) {
                  req.session.user = login;
                  res.redirect('/');
                });
              });  
            }
          });
        });
      } else {
        res.send(200, 'oauth issues dude');
        res.redirect('/login');
      }
    }
  );
});

app.get('/login', function(req, res) {
  req.session.destroy(function(err) {
    console.log(err);
  });  
  res.render('login');
});

app.post('/login', function(req, res) {
  res.redirect(gitHubUrl);
  // new User({ username: req.body.username }).fetch().then(function(foundUser) {
  //   if (foundUser) {
  //     foundUser.isSamePw(req.body.password).then(function(correctPw) {
  //       if (correctPw) {
  //         req.session.regenerate(function(err) {
  //           req.session.user = req.body.username;
  //           res.redirect('/');
  //         });
  //       } else {
  //         res.send(200, 'wrong password dude');
  //         res.redirect('/login');
  //       }
  //     });
  //   } else {
  //     res.send(200, 'Username or password is invalid.');
  //     res.redirect('/login');
  //   }
  // });
});

app.get('/links', app.restrict, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  res.redirect(gitHubUrl);

  // new User({ username: req.body.username }).fetch().then(function(found) {
  //   if (found) {
  //     res.send(200, 'Username already exists.');
  //   } else {
  //     if (req.body.username === '' ||
  //         req.body.password === '' ||
  //         req.body.username.length > 40 ||
  //         req.body.password.length > 40) {
  //       throw new Error('Invalid Username/Password');
  //     }
  //     Users.create({
  //       username: req.body.username,
  //       password: req.body.password,
  //     })
  //     .then(function(newUser) {
  //       req.session.regenerate(function(err) {
  //         req.session.user = req.body.username;
  //         res.redirect('/');
  //       });
  //     });
  //   }
  // }).catch(function(err) {
  //   console.log(err);
  //   res.status(500).send(err.message);
  // });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});


/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
