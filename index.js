import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
// import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import axios from "axios";


 
const app = express();
const port = 3000;
const saltRounds = 10;
const bookSearchUrl = "https://openlibrary.org/search.json"
const coverPageUrl = "https://covers.openlibrary.org/b/id/"
let bookPageNo = 1;
let newName = "";

app.use(session({
    secret: "BOOKKEEPERSECRET",
    resave : false,
    saveUninitialized : true,
    cookie : {
        maxAge : 1000 * 60 * 60,
    }
}));

const db = new pg.Client({
    user : "postgres",
    host : "localhost",
    database : "bookNotes",
    password : "Hanuman@9766",
    port : 5432,
});

db.connect();



app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(passport.initialize());
app.use(passport.session());


app.get("/" ,  (req ,res) =>{
   res.render("home.ejs")
    
});

app.get("/login" ,(req , res) =>{
    res.render("login.ejs")
} )

app.get("/register" , (req , res) =>{
    res.render("register.ejs")
})

app.get("/logout" ,(req , res)=>{
    req.logout(function (err) {
        if (err) {
          return next(err);
        }
        res.redirect("/");
      });

});


app.get("/notes" ,async (req , res) =>{
    if ( req.isAuthenticated()){
        try {
            const result = await db.query("SELECT * FROM notes WHERE username = $1" , [req.user.username]);
            console.log(result.rows);
            res.render("index.ejs", {
                data : result.rows,
                image : coverPageUrl,
                
            });
        } catch (error) {
            console.log("error");
        }
    }else{
        res.redirect("/")
    }
})

app.post("/search", async (req, res) =>{
    bookPageNo = 1
    const searchQuery = req.body.bookName.split() ;
    newName = searchQuery.join("+");
    console.log(newName);
    try {
        const result = await axios.get(bookSearchUrl , ({
            params :{
                q : newName,
                page : bookPageNo,
                limit : 12,
            }
        }));
        res.render("search.ejs" , {
            data : result.data.docs,
            image : coverPageUrl,
            page : bookPageNo,
        });
    } catch (error) {
        console.log(error);
    }
})

app.get("/next" , async (req, res)=>{
    bookPageNo += 1;
    if(req.isAuthenticated()){
        try {
            const result = await axios.get(bookSearchUrl , ({
            params :{
                q : newName,
                page : bookPageNo,
                limit : 12,
            }
        }));
        res.render("search.ejs" , {
            data : result.data.docs,
            image : coverPageUrl,
            page : bookPageNo,
        });
        } catch (error) {
            console.log(error)
        }
    }else {
        res.redirect("/")
    }
   
});

app.get("/previous" , async (req, res)=>{
    bookPageNo -= 1;
    if(req.isAuthenticated()){
        if(bookPageNo > 1){
            try {
                const result = await axios.get(bookSearchUrl , ({
                params :{
                    q : newName,
                    page : bookPageNo,
                    limit : 12,
                }
            }));
            res.render("search.ejs" , {
                data : result.data.docs,
                image : coverPageUrl,
                page : bookPageNo,
            });
            } catch (error) {
                console.log(error)
            }
        }else{
            bookPageNo = 1
            try {
                const result = await axios.get(bookSearchUrl , ({
                params :{
                    q : newName,
                    page : bookPageNo,
                    limit : 12,
                }
            }));
            res.render("search.ejs" , {
                data : result.data.docs,
                image : coverPageUrl,
                page : bookPageNo,
            });
            } catch (error) {
                console.log(error)
            }
        }
    }else{
        res.redirect("/")
    }
   
});

app.post("/add", async (req, res) =>{
    const bookCover = req.body.addCover;
    console.log(bookCover)
    res.render("new.ejs" , {
        
        image : coverPageUrl,
        coverId : bookCover
    })
})

app.post("/addNewBookInfo", async (req, res) =>{
   const coverId = req.body.coverid;
   const notes = req.body.notes;
   const rating = req.body.rating;
   const date = req.body.currentDate;
   const time = req.body.currentTime
   try {
    const result = await db.query("INSERT INTO notes(cover_id , note , rating , dateandday , time , username) VALUES ( $1 , $2, $3, $4 , $5 , $6)" , [coverId, notes, rating , date, time , req.user.username]);
    res.redirect("/notes")
   } catch (error) {
    console.log(error);
   }

});

app.post("/edit" , async (req ,res) =>{
    const cover_id = req.body.coverID;
    try {
        const result  = await db.query("SELECT * FROM notes WHERE cover_id = $1 AND username = $2 " , [cover_id , req.user.username]);
        console.log(result.rows);
        res.render("new.ejs" , {
            image : coverPageUrl,
            data : result.rows,
            coverId : cover_id
            
        });
    } catch (error) {
        console.log(error);
    }

});

app.post("/update", async (req , res) =>{
    const coverId = req.body.coverid;
   const notes = req.body.notes;
   const rating = req.body.rating;
   const date = req.body.currentDate;
   const time = req.body.currentTime;
   try {
    const result = await db.query ("UPDATE notes SET note = $1 , rating = $2 , dateandday = $3, time = $5 WHERE cover_id = $4 AND username = $6" , [notes, rating , date, coverId, time , req.user.username]);
    res.redirect("/notes")
   } catch (error) {
    console.log(error)
   }
})

app.post("/delete", async (req , res )=>{
    const cover_id = req.body.delete;
    try {
        const result = await db.query("DELETE FROM notes WHERE cover_id = $1 AND username = $2" , [cover_id , req.user.username]);
        res.redirect("/notes");
    } catch (error) {
        console.log(error);
    }
} )

app.post("/register" , async  (req, res)=>{
    const email = req.body.username;
    const password = req.body.password;
    try {
        const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [
            email,
          ]);
        let userFound = checkResult.rows.length;
        if (userFound > 0){
            req.redirect("/login")
        }else{
            bcrypt.hash(password , saltRounds ,async (err ,hash )=>{
                if(err){
                    console.log("Error hashing password:", err)
                }else{
                   const result =  await db.query("INSERT INTO users (username , password) VALUES ($1 , $2) RETURNING * ",
                    [email , hash]);
                    const user = result.rows[0];
                    req.login( user , (err) =>{
                        console.log("success")
                        res.redirect("/notes")
                    })
                }

            });
        }
    } catch (error) {
        console.log(err);
    }
})


app.post("/login" , passport.authenticate("local" , {
    successRedirect : "/notes",
    failureRedirect : "/login"
}))

passport.use("local" , 
    new Strategy( async function verify(username , password , cb){
        try {
            const result = await db.query("SELECT * FROM users WHERE username = $1" ,
            [username]);
            if(result.rows.length > 0){
                const user = result.rows[0];
                const storedHashedPassword = user.password;
                bcrypt.compare(password , storedHashedPassword , (err , valid)=>{
                    if (err) {
                        console.log("Error comparing password:" ,err)
                        return cb(err)
                    } else {
                        if(valid){
                            return cb(null , user)
                        }else{
                            return cb(null , false)
                        }
                        
                    }
                });
            }else{
                return cb("user not found");
            }
        } catch (error) {
            console.log(error)
        }
    })
);


passport.serializeUser((user , cb)=>{
    cb (null , user);
});
passport.deserializeUser((user , cb)=>{
    cb (null , user);
});


app.listen(port , ()=>{
    console.log(`Server running on port ${port}`);
})
