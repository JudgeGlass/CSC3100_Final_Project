const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const cors = require("cors")

const HTTP_PORT = 8000

var app = express()
app.use(express.json())
app.use(cors({ origin: true }))

app.listen(HTTP_PORT,() => {
    console.log('Listening on',HTTP_PORT)
})

app.get('/test',(req,res,next) => {
    res.status(200).json({"message":"ok"})
})

app.post("/api/save/", (req, res) => {
  const resumeContent = req.body.content;
  console.log("Content: ", resumeContent);
});
