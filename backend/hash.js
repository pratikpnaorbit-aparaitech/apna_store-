const bcrypt = require("bcryptjs");

const password = "staff123";   

bcrypt.hash(password, 10).then(hash => {
  console.log("Hashed password:", hash);
});
