const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const cors = require("cors")
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { hashPassword, comparePassword, generateToken, verifyToken } = require("./auth");
const {
    initializeDatabase,
    registerUser,
    getUserPasswordHash,
    updateUserToken,
    getUserToken,
    verifyUserExists,
    revokeToken,
    saveResume,
    getResume
} = require("./db");

require('dotenv').config()

const HTTP_PORT = 8000

var app = express()
app.use(express.json())
app.use(cors({ origin: true }))

const dbResumes = new sqlite3.Database('resumes.db', (err) => {
    if(err){
        console.error("Error opening database:",err.message)
    } else {
        console.log("Connected to resumes.db")
    }
})

const dbAccounts = new sqlite3.Database('accounts.db', (err) => {
    if(err){
        console.error("Error opening database:",err.message)
    } else {
        console.log("Connected to accounts.db")
    }
})

app.listen(HTTP_PORT,() => {
    initializeDatabase(dbResumes, dbAccounts);

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

app.post("/api/login/", async (req, res) => {
    const username = req.body?.username;
    const password = req.body?.password;
    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required" });
    }

    if(!(await verifyUserExists(dbAccounts, username))){
        return res.status(404).json({ error: "User not found" });
    }

    const passwordHash = await getUserPasswordHash(dbAccounts, username);

    if (!passwordHash) {
        return res.status(500).json({ error: "Failed to retrieve user information" });
    }

    if (!(await comparePassword(password, passwordHash))) {
        return res.status(401).json({ error: "Invalid password" });
    }

    const token = generateToken(username);
    res.status(200).json({ token });
});

app.post("/api/register/", async (req, res) => {
    const username = req.body?.username;
    const password = req.body?.password;
    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required" });
    }
    if(await verifyUserExists(dbAccounts, username)){
        return res.status(409).json({ error: "Username already exists" });
    }

    const passwordHash = await hashPassword(password);
    try {
        await registerUser(dbAccounts, username, passwordHash);
    } catch (err) {
        console.error("Error registering user:", err.message);
        return res.status(500).json({ error: "Failed to register user" });
    }
    // In a real application, you would save the user to the database here
    // For this example, we will assume registration is always successful

    const token = generateToken(username);
    res.status(200).json({ token });
});

app.post("/api/logout/", async (req, res) => {
    const jwtToken = req.headers?.authorization?.split(" ")[1]; // Expecting "Bearer <token>"

    if(!jwtToken){
        return res.status(401).json({ error: "Authorization header with JWT token is required" });
    }

    const verifiedToken = await verifyToken(jwtToken);
    if(!verifiedToken){
        return res.status(403).json({ error: "Invalid token for the specified username" });
    }

    const username = verifiedToken.username;

    try {
        await revokeToken(dbAccounts, username);
        res.status(200).json({ message: "Logout successful" });
    } catch (err) {
        console.error("Error during logout:", err.message);
        res.status(500).json({ error: "Failed to logout user" });
    }
});

app.get("/api/resume/", async (req, res) => {
    const jwtToken = req.headers?.authorization?.split(" ")[1]; // Expecting "Bearer <token>"

    if(!jwtToken){
        return res.status(401).json({ error: "Authorization header with JWT token is required" });
    }

    const verifiedToken = await verifyToken(jwtToken);
    if(!verifiedToken){
        return res.status(403).json({ error: "Invalid token for the specified username" });
    }

    const username = verifiedToken.username;

    if(await verifyUserExists(dbAccounts, username)){
        try {
            const resumeData = await getResume(dbResumes, username);
            res.status(200).json({ resume: resumeData });
        } catch (err) {
            console.error("Error retrieving resume:", err.message);
            res.status(500).json({ error: "Failed to retrieve resume" });
        }
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

app.post("/api/save/", async (req, res) => {
  const jwtToken = req.headers?.authorization?.split(" ")[1]; // Expecting "Bearer <token>"

  if (!jwtToken) {
    return res.status(401).json({ error: "Authorization header with JWT token is required" });
  }

  const verifiedToken = verifyToken(jwtToken);
  if (!verifiedToken) {
    return res.status(403).json({ error: "Invalid token for the specified username" });
  }
  const resumeContent = req.body.content;

  if(await saveResume(dbResumes, resumeContent)){
    res.status(200).json({ message: "Resume saved successfully" });
  } else {
    res.status(500).json({ error: "Failed to save resume" });
  }
});

app.post("/api/suggest/", async (req, res) => {
    const jwtToken = req.headers?.authorization?.split(" ")[1]; // Expecting "Bearer <token>"

    if (!jwtToken) {
        return res.status(401).json({ error: "Authorization header with JWT token is required" });
    }

    const verifiedToken = verifyToken(jwtToken);
    if (!verifiedToken) {
        return res.status(403).json({ error: "Invalid token for the specified username" });
    }

    const resume_section = req.body?.section
    const resume_content = req.body?.content
    const apiKey = req.body?.apiKey

    if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    
    if (!resume_section) {
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
