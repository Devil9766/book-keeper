import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

 
const app = express();
const port = 3000;
const db = new pg.Client({
    user : "postgres",
    host : "localhost",
    database : "bookNotes",
    password : "Hanuman@9766",
    port : 5432,
});


const connectionString = "postgres://devil:H8bNa070MJ5QGE2OeCZxNcJyzdMQMOsK@dpg-cn65mhed3nmc739glb3g-a.oregon-postgres.render.com/booknotes";//you can create your postgreSQL server on render.com or Vercel and then they'll give u external URL copy that and paste it here
 
const onlineDatabaseLink = new pg({
  connectionString: connectionString,
  // If you're using a service like Heroku, you might need this for SSL:
  ssl: {
    rejectUnauthorized: false,
  },
});

db.connect();

const bookSearchUrl = "https://openlibrary.org/search.json"
const coverPageUrl = "https://covers.openlibrary.org/b/id/"
let bookPageNo = 1;
let newName = "";

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));


app.get("/" , async (req ,res) =>{
    try {
        const result = await db.query("SELECT * FROM notes");
        console.log(result.rows);
        res.render("index.ejs", {
            data : result.rows,
            image : coverPageUrl,
            
        });
    } catch (error) {
        console.log("error");
    }
    
    
});


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
   
});

app.get("/previous" , async (req, res)=>{
    bookPageNo -= 1;
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
    const result = await db.query("INSERT INTO notes(cover_id , note , rating , dateandday , time) VALUES ( $1 , $2, $3, $4 , $5)" , [coverId, notes, rating , date, time]);
    res.redirect("/")
   } catch (error) {
    console.log(error);
   }

});

app.post("/edit" , async (req ,res) =>{
    const cover_id = req.body.coverID;
    try {
        const result  = await db.query("SELECT * FROM notes WHERE cover_id = $1 " , [cover_id])
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
    const result = await db.query ("UPDATE notes SET note = $1 , rating = $2 , dateandday = $3, time = $5 WHERE cover_id = $4" , [notes, rating , date, coverId, time]);
    res.redirect("/")
   } catch (error) {
    console.log(error)
   }
})

app.post("/delete", async (req , res )=>{
    const cover_id = req.body.delete;
    try {
        const result = await db.query("DELETE FROM notes WHERE cover_id = $1" , [cover_id]);
        res.redirect("/");
    } catch (error) {
        console.log(error);
    }
} )



app.listen(port , ()=>{
    console.log(`Server running on port ${port}`);
})
