import passport from 'passport';
import Strategy from 'passport-local';

import { User } from 'api/user';
import { BadRequestError } from 'utils/api';

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => User.findById(id, (err, user) => done(err, user)));

passport.use(
  'local-login',
  new Strategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    (req, email, password, done) => {
      let user;
      User.findOne({ email })
        .then(result => {
          if (!result) {
            throw new BadRequestError({ password: 'Email or password is wrong' });
          }

          user = result;
          return user.authenticate(password);
        })
        .then(isAuthenticated => {
          if (!isAuthenticated) {
            throw new BadRequestError({ password: 'Email or password is wrong' });
          }

          return done(null, user);
        })
        .catch(done);
    }
  )
);

passport.use(
  'local-register',
  new Strategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    (email, password, done) => {
      let user;
      User.findOne({ email })
        .then(result => {
          if (result) {
            throw new HttpError({ password: 'This email is already used' }, 400);
          }

          user = new User({ email });
          return user.setPassword(password);
        })
        .then(() => user.save())
        .then(result => done(null, result))
        .catch(done);
    }
  )
);

const authenticate = (strategy, req, res, next) =>
  new Promise((resolve, reject) => {
    passport.authenticate(strategy, { failureMessage: true }, (err, user) => {
      if (err) {
        reject(err);
      }

      req.login(user, loginErr => (loginErr ? reject(loginErr) : resolve(user)));
    })(req, res, next);
  });

export { authenticate };
export default passport;