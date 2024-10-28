const express = require("express");
const moment = require("moment");
const sqlite3 = require("sqlite3");
const path = require("path");
const { off } = require("process");

// database setting
const db_name = path.join(__dirname, "post.db"); // sqlite3 database file name
const db = new sqlite3.Database(db_name);

const create_sql = `
    create table if not exists posts(
         id integer primary key autoincrement,
         title varchar(255),
         content text,
         author varchar(100),
         createdAt datetime default current_timestamp,
         count integer default 0
    );
`;
db.serialize(() => {
  db.run(create_sql, (err) => {
    console.log(err);
  }); // post.db
});

// npx nodemon api.js
const app = express();
const PORT = 3000;
app.use(express.json());

// POST /posts : create
app.post("/posts", (req, res) => {
  const { title, content, author } = req.body;

  let sql = `insert into posts(title, content, author) values (?,?,?)`;

  // insert, update, delete
  db.run(sql, [title, content, author], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    console.log(`row id : ${JSON.stringify(this)}`);
    res.status(201).json({ result: "success", id: this.lastID });
  });
});

// localhost:3000/post?page=2

app.get("/posts", (req, res) => {
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limit = 5;
  const offset = (page - 1) * limit;
  let sql = `select id, title, author, createdAt, count from posts
    order by createdAt desc limit ? offset ?`;
  db.all(sql, [limit, offset], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    let total_sql = `select count(1) as count from posts`;
    db.get(total_sql, (err1, row) => {
      if (err1) {
        res.status(500).json({ error: err1.message });
      }
      const total = row.count;
      const totalPages = Math.ceil(total / limit);
      res
        .status(200)
        .json({ currentPage: page, totalPages: totalPages, items: rows });
      // totalPages == currentPage 인 경우 맨 끝 페이지
    });
  });
});

app.get("/posts/:id", (req, res) => {
  const id = req.params.id;
  let sql = `select id, title, content, author, createdAt count from posts where id = ?`;
  let count_sql = `update posts set count = count + 1 where id = ?`;
  db.run(count_sql, [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    db.get(sql, [id], (err1, row) => {
      if (err1) {
        res.status(500).json({ error: err1.message });
      }
      res.json({ item: row });
    });
  });
});

app.put("/posts/:id", (req, res) => {
  const id = req.params.id;
  const { title, content } = req.body;
  let sql = `update posts set title = ? , content = ? where id = ?`;
  db.run(sql, [title, content, id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json({ result: "success" });
  });
});

app.delete("/posts/:id", (req, res) => {
  const { id } = req.params;
  let sql = `delete from posts where id = ?`;
  db.run(sql, [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    }
    res.json({ result: "success" });
  });
});

app.listen(PORT);
