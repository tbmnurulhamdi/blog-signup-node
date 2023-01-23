const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'progate',
  password: 'password',	
  database: 'blog'
});

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    res.locals.username = 'Tamu';
    res.locals.isLoggedIn = false;
  } else {
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();
});

app.get('/', (req, res) => {
  res.render('top.ejs');
});

app.get('/list', (req, res) => {
  connection.query(
    'SELECT * FROM articles',
    (error, results) => {
      res.render('list.ejs', { articles: results });
    }
  );
});

app.get('/article/:id', (req, res) => {
  const id = req.params.id;
  connection.query(
    'SELECT * FROM articles WHERE id = ?',
    [id],
    (error, results) => {
      res.render('article.ejs', { article: results[0] });
    }
  );
});

app.get('/signup', (req, res) => {
  res.render('signup.ejs', { errors: [] }); //property error masih kosong
});

app.post('/signup',

  // function middleware memeriksa input nilai kosong
  (req, res, next) => {
    console.log('Pemeriksaan input bernilai kosong');
    const username = req.body.username; //mengambil nilai username dari form
    const email = req.body.email; //mengambil nilai email dari form
    const password = req.body.password; //mengambil nilai password dari form
    const errors = []; // array yang menampung pesan-pesan error

    if (username === '') { // proses validasi username
      errors.push('Nama Pengguna kosong'); //menambahkan pesan error username
    }

    if (email === '') { //proses validasi email
      errors.push('Email kosong'); //menambahkan pesan error email
    }

    if (password === '') { // proses validasi password
      errors.push('Kata Sandi kosong'); //menambahkan pesan error password
    }

    if (errors.length > 0) { // jika input kosong
      res.render('signup.ejs', { errors: errors }); //redirect ke hal pendaftaran dan membawa pesan errors
    } else {
      next(); // jika isi lanjutkan pendaftaran
    }
  },

  // function middleware kedua untuk cek email duplikat 
  (req, res, next) => {
    console.log('Pemeriksaan email duplikat');
    const email = req.body.email; // mengambil nilai input email dari form
    const errors = []; // array yang menampung pesan-pesan error
    connection.query(
      'SELECT * FROM users WHERE email = ?', // mecari email yang terdaftar
      [email],
      (error, results) => {
        if (results.length > 0) { // jika ditemukan telah terdaftar maka akan muncul pesan error
          errors.push('Pendaftaran pengguna gagal');
          res.render('signup.ejs', { errors: errors });
        } else {
          next();
        }
      }
    );
  },
  (req, res) => {
    console.log('Pendaftaran pengguna');
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password, 10, (error, hash) => { // proses enkripsi password dengan method hash
      connection.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hash],
        (error, results) => {
          req.session.userId = results.insertId; // Tetapkan ID dari pengguna baru yang terdaftar pada req.session.userId

          req.session.username = username; // Tetapkan `username` dari pengguna baru yang terdaftar pada req.session.username
          res.redirect('/list'); 
        }
      );
    });
  }
);

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error, results) => {
      if (results.length > 0) {
        const plain = req.body.password; // mengambil password dari form login dan didefinisikan pada const plain

        const hash = results[0].password; // mengambil password dari database dan didefinisikan pada const hash

        //melakukan perbandingan dengan method compare dan hasil perbandigan disimpan ke isEqual
        bcrypt.compare(plain, hash, (error, isEqual) => {
          if (isEqual) {
            req.session.userId = results[0].id;
            req.session.username = results[0].username;
            res.redirect('/list');
          } else {
            res.render('login.ejs');
          }
        });
      } else {
        res.redirect('/login');
      }
    }
  );
});

app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    res.redirect('/list');
  });
});

app.listen(3000);
