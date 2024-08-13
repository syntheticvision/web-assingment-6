const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new Schema({
  userName: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  loginHistory: [
    {
      dateTime: {
        type: Date,
        required: true,
      },
      userAgent: {
        type: String,
        required: true,
      },
    },
  ],
});

const User = mongoose.model('User', userSchema);

function initialize() {
  return new Promise((resolve, reject) => {
    User
      .findOne()
      .then(() => resolve())
      .catch(reject);
  });
}

function registerUser(userData) {
  return new Promise((resolve, reject) => {
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
    } else {
      bcrypt.hash(userData.password, 10).then(hash => {
        userData.password = hash;
        let newUser = new User(userData);
        newUser.save()
          .then(() => resolve())
          .catch(err => {
            if (err.code === 11000) {
              reject("User Name already taken");
            } else {
              reject("There was an error creating the user: " + err);
            }
          });
      });
    }
  });
}

function checkUser(userData) {
  return new Promise((resolve, reject) => {
    User.find({ userName: userData.userName })
      .then(users => {
        if (users.length === 0) {
          reject("Unable to find user: " + userData.userName);
        } else {
          bcrypt.compare(userData.password, users[0].password)
            .then(result => {
              if (result) {
                if (users[0].loginHistory.length === 8) {
                  users[0].loginHistory.pop();
                }
                users[0].loginHistory.unshift({ dateTime: (new Date()).toString(), userAgent: userData.userAgent });
                User.updateOne({ userName: users[0].userName }, { $set: { loginHistory: users[0].loginHistory } })
                  .then(() => resolve(users[0]))
                  .catch(err => reject("There was an error verifying the user: " + err));
              } else {
                reject("Incorrect Password for user: " + userData.userName);
              }
            })
            .catch(err => reject("There was an error verifying the user: " + err));
        }
      })
      .catch(() => reject("Unable to find user: " + userData.userName));
  });
}

module.exports = {
  initialize,
  registerUser,
  checkUser
};
