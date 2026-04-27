const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const cors = require("cors")
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config()

const HTTP_PORT = 8000

var app = express()
app.use(express.json())
app.use(cors({ origin: true }))

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

const dbResumes = new sqlite3.Database('resumes.db', (err) => {
    if(err){
        console.error("Error opening database:",err.message)
    } else {
        console.log("Connected to resumes.db")
    }
})

const dbSessions = new sqlite3.Database('sessions.db', (err) => {
    if(err){
        console.error("Error opening database:",err.message)
    } else {
        console.log("Connected to sessions.db")
    }
})

app.listen(HTTP_PORT,() => {

    const createTableSql = `
    CREATE TABLE IF NOT EXISTS resumes (
        username TEXT PRIMARY KEY NOT NULL,
        fullName TEXT,
        headline TEXT,
        email TEXT,
        phone TEXT,
        location TEXT,
        website TEXT,
        summary TEXT,
        experience TEXT,
        education TEXT,
        projects TEXT,
        skills TEXT
    )`;

    // Execute the SQL statement to create the table
    dbResumes.run(createTableSql, (err) => {
        if (err) {
            return console.error('Error creating table:', err.message);
        }
        console.log('Table created successfully');
    });


    console.log('Listening on',HTTP_PORT)
})

app.get('/test',(req,res,next) => {
    res.status(200).json({"message":"ok"})
})


/* Save Layout
Content:  {
  username: '',
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  website: '',
  summary: '<p><br></p>',
  experience: '<p><br></p>',
  education: '<p><br></p>',
  projects: '<p><br></p>',
  skills: '<p><br></p>'
}
*/

app.get("/api/resume/:username", (req, res) => {
  const username = req.params.username;
  const sql = `SELECT * FROM resumes WHERE username = ?`;
  
  dbResumes.get(sql, [username], (err, row) => {
    if (err) {
      console.error("Error retrieving resume:", err.message);
      res.status(500).json({ error: "Failed to retrieve resume" });
    } else if (row) {
      res.status(200).json(row);
    } else {
      res.status(404).json({ error: "Resume not found" });
    }
  });
});

app.post("/api/save/", (req, res) => {
  const resumeContent = req.body.content;
  console.log("Content: ", resumeContent);

  const sql = `INSERT INTO resumes (username, fullName, headline, email, phone, location, website, summary, experience, education, projects, skills)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(username) DO UPDATE SET
                   fullName=excluded.fullName,
                   headline=excluded.headline,
                   email=excluded.email,
                   phone=excluded.phone,
                   location=excluded.location,
                   website=excluded.website,
                   summary=excluded.summary,
                   experience=excluded.experience,
                   education=excluded.education,
                   projects=excluded.projects,
                   skills=excluded.skills`;

  const params = [
    resumeContent.username,
    resumeContent.fullName,
    resumeContent.headline,
    resumeContent.email,
    resumeContent.phone,
    resumeContent.location,
    resumeContent.website,
    resumeContent.summary,
    resumeContent.experience,
    resumeContent.education,
    resumeContent.projects,
    resumeContent.skills
  ];

  dbResumes.run(sql, params, function(err) {
    if (err) {
      console.error("Error saving resume:", err.message);
      res.status(500).json({ error: "Failed to save resume" });
    } else {
      console.log("Resume saved successfully");
      res.status(200).json({ message: "Resume saved successfully" });
    }
  });
});

app.post("/api/suggest/", async (req, res) => {
    const username = req.body?.username
    const resume_section = req.body?.section
    const resume_content = req.body?.content
    
    if (!username || !resume_section) {
        return res.status(400).json({ error: "Missing username or section in request body" });
    }

    const prompt = `Given the following resume content for the section "${resume_section}", provide suggestions to enhance it. The current content is: ${resume_content}. Please suggest improvements or additions that could make this section stronger and more compelling for potential employers. Focus on clarity, impact, and relevance to the job market. Make the entire response an HTML formatted response that can be directly inserted into the resume editor. Don't add any explanations or disclaimers, just provide the improved content.`;


    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Generated content:", text);
        res.status(200).json({ suggestion: text });
    } catch (error) {
        console.error("Error generating content:", error);
        res.status(500).json({ error: "Failed to generate content" });
    }
});
