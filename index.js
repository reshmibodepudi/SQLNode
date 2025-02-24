require('dotenv').config(); // Load environment variables

const express = require("express");
const app = express();

const { faker } = require("@faker-js/faker");
const mysql = require("mysql2");
const methodOverride = require("method-override");
const { v4: uuidv4 } = require("uuid");

const path = require("path");

app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

let getUser = () => {
  return [
    faker.datatype.uuid(),
    faker.internet.userName(),
    faker.internet.email(),
    faker.internet.password(),
  ];
};

let connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// My routes...

app.get("/", (req, res) => {
  let q = `SELECT count(*) FROM user`;
  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let count = result[0]["count(*)"];
      res.render("home.ejs", { count });
    });
  } catch (err) {
    res.send("some error occurred");
  }
});

app.get("/user", (req, res) => {
  let q = `SELECT * FROM user`;
  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let data = result;
      res.render("users.ejs", { data });
    });
  } catch (err) {
    res.send("some error occurred");
  }
});

app.get("/user/:id/edit", (req, res) => {
  let { id } = req.params;
  let q = `SELECT * FROM user WHERE id='${id}'`;

  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let user = result[0];
      res.render("edit.ejs", { user });
    });
  } catch (err) {
    res.send("some error with DB");
  }
});

app.patch("/user/:id", (req, res) => {
  let { id } = req.params;
  let { username, password } = req.body;
  console.log(username);
  let q = `SELECT * FROM user WHERE id='${id}'`;

  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let user = result[0];

      if (user.password != password) {
        res.send("WRONG Password entered!");
      } else {
        let q2 = `UPDATE user SET username='${username}' WHERE id='${id}'`;
        connection.query(q2, (err, result) => {
          if (err) throw err;
          else {
            console.log(result);
            console.log("updated!");
            res.redirect("/user");
          }
        });
      }
    });
  } catch (err) {
    res.send("some error with DB");
  }
});

app.get("/user/new", (req, res) => {
  res.render("new.ejs");
});


app.post("/user/new", (req, res) => {
  let { username, email, password } = req.body;
  let id = uuidv4();

  // Query to insert new user
  let q = `INSERT INTO user (id, username, email, password) VALUES (?, ?, ?, ?)`;

  try {
    connection.query(q, [id, username, email, password], (err, result) => {
      if (err) throw err;
      
      // Query to get the newly created user
      connection.query('SELECT * FROM user WHERE id = ?', [id], (err, result) => {
        if (err) throw err;
        
        let user = result[0];

        // Fetch user's articles
        connection.query('SELECT * FROM articles WHERE user_id = ?', [id], (err, articles) => {
          if (err) throw err;
          res.render('signedin.ejs', { user, articles });
        });
      });
    });
  } catch (err) {
    res.send("some error occurred");
  }
});

// Login route
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const userQuery = 'SELECT * FROM user WHERE email = ? AND password = ?';
  const articlesQuery = 'SELECT * FROM articles WHERE user_id = ?';
  try {
      connection.execute(userQuery, [email, password], (err, userResults) => {
          if (err) throw err;
          if (userResults.length > 0) {
              const user = userResults[0];
              connection.execute(articlesQuery, [user.id], (err, articlesResults) => {
                  if (err) throw err;
                  res.render("signedin.ejs", { user, articles: articlesResults });
              });
          } else {
              res.send("Invalid email or password");
          }
      });
  } catch (err) {
      res.send("Some error occurred");
  }
});

// Articles routes
app.get("/user/:id/articles", (req, res) => {
  const { id } = req.params;
  const userQuery = 'SELECT * FROM user WHERE id = ?';
  const articlesQuery = 'SELECT * FROM articles WHERE user_id = ?';

  try {
      connection.execute(userQuery, [id], (err, userResults) => {
          if (err) throw err;
          const user = userResults[0];
          connection.execute(articlesQuery, [id], (err, articlesResults) => {
              if (err) throw err;
              res.render("articles.ejs", { user, articles: articlesResults });
          });
      });
  } catch (err) {
      res.send("Some error occurred");
  }
});

app.get("/user/:id/articles/new", (req, res) => {
  const { id } = req.params;
  const userQuery = 'SELECT * FROM user WHERE id = ?';

  try {
      connection.execute(userQuery, [id], (err, userResults) => {
          if (err) throw err;
          const user = userResults[0];
          res.render("new_article.ejs", { user });
      });
  } catch (err) {
      res.send("Some error occurred");
  }
});

app.post("/user/:id/articles", (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const articleQuery = 'INSERT INTO articles (user_id, title, content) VALUES (?, ?, ?)';

  try {
      connection.execute(articleQuery, [id, title, content], (err, result) => {
          if (err) throw err;
          res.redirect(`/user/${id}/articles`);
      });
  } catch (err) {
      res.send("Some error occurred");
  }
});


app.get("/user/:id/delete", (req, res) => {
  let { id } = req.params;
  let q = `SELECT * FROM user WHERE id='${id}'`;

  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let user = result[0];
      res.render("delete.ejs", { user });
    });
  } catch (err) {
    res.send("some error with DB");
  }
});

app.delete("/user/:id/", (req, res) => {
  let { id } = req.params;
  let { password } = req.body;
  let q = `SELECT * FROM user WHERE id='${id}'`;

  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let user = result[0];

      if (user.password != password) {
        res.send("WRONG Password entered!");
      } else {
        let q2 = `DELETE FROM user WHERE id='${id}'`; //Query to Delete
        connection.query(q2, (err, result) => {
          if (err) throw err;
          else {
            console.log(result);
            console.log("deleted!");
            res.redirect("/user");
          }
        });
      }
    });
  } catch (err) {
    res.send("some error with DB");
  }
});

  //sigout
  app.post("/signout", (req,res) => {
    res.redirect("/login");
  });

app.listen("8080", () => {
  console.log("server running on port 8080");
});

//sigin

// app.get("/signin", (req, res) => {
//     res.render("signin.ejs");
//   });

// app.post("/signin", (req, res) => {
//     const { email, password } = req.body;
//     const query = 'SELECT * FROM user WHERE email = ? AND password = ?';
//     try {
//         connection.execute(query, [email, password], (err, results) => {
//         if (err) throw err;
//         let user = results[0];
//         if (user.email && user.password != password) {
//             res.send("WRONG details entered!");
//           } else {
//         console.log(user);
//         res.render("signedin.ejs", { user });}
//       });
//     } catch (err) {
//       res.send("some error with DB");
//     }
//   });
