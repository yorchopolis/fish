const log = require('winston');
const request = require('request');

const DbId = require('../util/db-id').DbId;
const Experimenter = require('../models/experimenter-model').Experimenter;

// GET /a/:id/profile
exports.displayProfileUpdate = function(req, res) {
  request.get(
    {
      url: 'http://localhost:8080/experimenters/' + req.params.accountId,
      headers: {
        cookie: req.headers.cookie,
      },
    },
    (err, apiResponse, body) => {
      if (apiResponse.statusCode !== 200) {
        return res.sendStatus(apiResponse.statusCode);
      }

      const exp = JSON.parse(body);
      return res.render('profile.pug', {
        name: exp.name,
        email: exp.email,
      });
    }
  );
};

// GET /experimenters
exports.list = function list(req, res) {
  Experimenter.find({}, function(_, docs) {
    return res.status(200).send(docs);
  });
};

// GET /experimenters/:id
exports.details = function details(req, res) {
  const id = new DbId(req.params.id);
  Experimenter.findOne({ _id: id.asObjectId }, function(_, exp) {
    if (!exp) {
      return res.sendStatus(404);
    }

    return res.status(200).send(exp);
  });
};

// POST /experimenters
exports.create = function(req, res) {
  // For now at least, we assume validation client-side
  var exp = {
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  };

  Experimenter.hashPassword(req.body.rawPassword, function done(_, pwd) {
    exp.passwordHash = pwd;
    Experimenter.create(exp, function(_, doc) {
      return res.status(200).send(doc);
    });
  });
};

// PUT /experimenters/:id
exports.update = function(req, res) {
  const exp = {};
  if (req.body.username) exp.username = req.body.username;
  if (req.body.name) exp.name = req.body.name;
  if (req.body.email) exp.email = req.body.email;
  if (req.body.rawPassword !== undefined) {
    Experimenter.hashPassword(req.body.rawPassword, function done(_, pwd) {
      exp.passwordHash = pwd;
      return updateExperimenter(req, res, exp);
    });
  } else {
    return updateExperimenter(req, res, exp);
  }
};

function updateExperimenter(req, res, exp) {
  Experimenter.updateOne({ _id: new DbId(req.params.id).asObjectId }, exp, function() {
    return res.sendStatus(204);
  });
}
