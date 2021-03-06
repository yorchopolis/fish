/*global describe:true, beforeEach:true, it:true*/
const assert = require('assert');
const request = require('supertest');

const app = require('../app').app;
const Experimenter = require('../models/experimenter-model').Experimenter;
const Superuser = require('../models/superuser-model').Superuser;
const setUpTestDb = require('../unit-utils').setUpTestDb;

const honeydew = {
  username: 'honeydew',
  name: 'Professor Honeydew',
  email: 'honeydew@muppets.show',
  passwordHash: '$2a$12$I5X7O/wRBX3OtKuy47OHz.0mJBLMN8NmQCRDpY84/5tGN02.zwOFG',
  rawPassword: '123456789',
};
const beaker = {
  username: 'beaker',
  name: 'Assistant Professor Beaker',
  email: 'beaker@muppets.show',
  passwordHash: 'we do not need a valid hash',
};
const kermit = {
  username: 'kermit',
  name: 'Kermit The Frog',
  email: 'kermit@muppets.show',
  passwordHash: '$2a$12$I5X7O/wRBX3OtKuy47OHz.0mJBLMN8NmQCRDpY84/5tGN02.zwOFG',
  rawPassword: '123456789',
};
let account_id;
let agent;

describe('GET /a/:id/profile', () => {
  describe('when a user is logged in', () => {
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, honeydew))
        .then(doc => getAgentForUser('/sessions', doc, honeydew.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should return a profile for the experimenter account', done => {
      agent
        .get('/a/' + account_id + '/profile')
        .expect(200)
        .end((err, res) => {
          assert(err === null, err);
          assert(res.text.includes('Update Profile'), 'Bad page header');
          assert(res.text.includes(honeydew.username), 'Bad username');
          assert(res.text.includes(honeydew.name), 'Bad name');
          assert(res.text.includes(honeydew.email), 'Bad email');
          return done();
        });
    });

    it('should redirect to login when trying to access an invalid profile', done => {
      agent
        .get('/a/notAValidId/profile')
        .expect(302)
        .end((err, res) => {
          assert(err === null, err);
          assert(res.header.location === '/admin', 'Bad redirection target');
          return done();
        });
    });

    it('should redirect to login when trying to access another valid profile', done => {
      createUser(Experimenter, beaker).then(doc => {
        agent
          .get('/a/' + doc.id + '/profile')
          .expect(302)
          .end((err, res) => {
            assert(err === null, err);
            assert(res.header.location === '/admin', 'Bad redirection target');
            return done();
          });
      });
    });
  });

  describe('when a user is *not* logged in', () => {
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, honeydew))
        .then(doc => {
          account_id = doc.id;
          agent = request.agent(app);
          return done();
        });
    });

    it('should not return a profile, even if it exists', done => {
      agent
        .get('/a/' + account_id + '/profile')
        .expect(302)
        .end((err, res) => {
          assert(err === null, err);
          assert(res.header.location === '/admin', 'Bad redirection target');
          return done();
        });
    });
  });
});

describe('GET /experimenters', () => {
  describe('when a superuser is making the request', () => {
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, honeydew))
        .then(() => createUser(Experimenter, beaker))
        .then(() => createUser(Superuser, kermit))
        .then(doc => getAgentForUser('/superuser-sessions', doc, kermit.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should return a list with all experimenters', done => {
      agent.get('/experimenters').end((err, res) => {
        assert(err === null, err);
        assert(res.statusCode === 200, 'Status code should be 200');
        assert(res.body.length === 2, 'Should return two experimenters');
        return done();
      });
    });
  });

  describe('when a non-superuser is making the request', () => {
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, honeydew))
        .then(doc => getAgentForUser('/sessions', doc, honeydew.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should return 401', done => {
      agent.get('/experimenters').end((err, res) => {
        assert(err === null, err);
        assert(res.statusCode === 401, 'Status code should be 401');
        return done();
      });
    });
  });
});

describe('POST /experimenters', () => {
  describe('when a superuser is making the request', () => {
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Superuser, kermit))
        .then(doc => getAgentForUser('/superuser-sessions', doc, kermit.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should create a new experimenter record', done => {
      agent
        .post('/experimenters')
        .send(honeydew)
        .end((err, res) => {
          assert(err === null, err);
          assert(res.statusCode === 200, 'Status code should be 200');
          assert(res.body.username === honeydew.username);
          assert(res.body.id !== null);
          assert(res.body.rawPassword === undefined);
          return done();
        });
    });
  });

  describe('when a non-superuser is making the request', () => {
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, honeydew))
        .then(doc => getAgentForUser('/sessions', doc, honeydew.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should return 401', done => {
      agent
        .post('/experimenters')
        .send(beaker)
        .end((err, res) => {
          assert(err === null, err);
          assert(res.statusCode === 401, 'Status code should be 401');
          return done();
        });
    });
  });
});

describe('GET /experimenters/:id', () => {
  describe('when a superuser is making the request', () => {
    let experimenterId;
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, honeydew))
        .then(exp => (experimenterId = exp.id))
        .then(() => createUser(Experimenter, beaker))
        .then(() => createUser(Superuser, kermit))
        .then(doc => getAgentForUser('/superuser-sessions', doc, kermit.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should return the details of the experimenter requested', done => {
      agent.get('/experimenters/' + experimenterId).end((err, res) => {
        assert(err === null, err);
        assert(res.statusCode === 200, 'Status code should be 200');
        assert(res.body.username === honeydew.username);
        assert(res.body.name === honeydew.name);
        return done();
      });
    });

    it('should return 404 if the record does not exist', done => {
      agent.get('/experimenters/notAValidId').end((err, res) => {
        assert(err === null, err);
        assert(res.statusCode === 404, 'Status code should be 404');
        return done();
      });
    });
  });

  describe('when a user is making the request', () => {
    let beakerId;
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, beaker))
        .then(exp => (beakerId = exp.id))
        .then(() => createUser(Experimenter, honeydew))
        .then(doc => getAgentForUser('/sessions', doc, honeydew.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should return the details for their own record', done => {
      agent.get('/experimenters/' + account_id).end((err, res) => {
        assert(err === null, err);
        assert(res.statusCode === 200, 'Status code should be 200');
        assert(res.body.username === honeydew.username);
        assert(res.body.name === honeydew.name);
        return done();
      });
    });

    it('should return 401 for a different experimenter record', done => {
      agent.get('/experimenters/' + beakerId).end((err, res) => {
        assert(err === null, err);
        assert(res.statusCode === 401, 'Status code should be 401');
        return done();
      });
    });
  });
});

describe('PUT /experimenters/:id', () => {
  describe('when a superuser is making the request', () => {
    let experimenterId;
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, honeydew))
        .then(exp => (experimenterId = exp.id))
        .then(() => createUser(Superuser, kermit))
        .then(doc => getAgentForUser('/superuser-sessions', doc, kermit.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should allow them to do it', done => {
      agent
        .put('/experimenters/' + experimenterId)
        .send({
          username: beaker.username,
          name: beaker.name,
          email: beaker.email,
          rawPassword: 'a new password',
          confirmPass: 'a new password',
        })
        .end((err, res) => {
          assert(err === null, err);
          assert(res.statusCode === 204, 'Status code should be 204');
          return done();
        });
    });
  });

  describe('when a user is making the request', () => {
    let beakerId;
    beforeEach(done => {
      setUpTestDb()
        .then(() => createUser(Experimenter, beaker))
        .then(exp => (beakerId = exp.id))
        .then(() => createUser(Experimenter, honeydew))
        .then(doc => getAgentForUser('/sessions', doc, honeydew.rawPassword))
        .then(result => {
          account_id = result.doc.id;
          agent = result.agent;
          return done();
        });
    });

    it('should allow them to do it', done => {
      agent
        .put('/experimenters/' + account_id)
        .send({
          username: kermit.username,
          name: kermit.name,
          email: kermit.email,
          rawPassword: 'a new password',
          confirmPass: 'a new password',
        })
        .end((err, res) => {
          assert(err === null, err);
          assert(res.statusCode === 204, 'Status code should be 204');
          return done();
        });
    });

    it('should return 401 for a different experimenter record', done => {
      agent
        .put('/experimenters/' + beakerId)
        .send({
          username: kermit.username,
          name: kermit.name,
          email: kermit.email,
          rawPassword: 'a new password',
          confirmPass: 'a new password',
        })
        .end((err, res) => {
          assert(err === null, err);
          assert(res.statusCode === 401, 'Status code should be 401');
          return done();
        });
    });
  });
});

function createUser(model, fields) {
  return new Promise((resolve, reject) => {
    model.create(fields, (err, doc) => {
      if (err) reject(err);
      resolve(doc);
    });
  });
}

function getAgentForUser(endpoint, fields, rawPassword) {
  return new Promise((resolve, reject) => {
    const userAgent = request.agent(app);
    userAgent
      .post(endpoint)
      .send({ username: fields.username, password: rawPassword })
      .end(err => {
        if (err) reject(err);
        resolve({ doc: fields, agent: userAgent });
      });
  });
}
