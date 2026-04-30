// **** [ Entire file written by me ] ****
const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const cors = require("cors")
const { GoogleGenerativeAI } = require("@google/generative-ai")

const { hashPassword, comparePassword, generateToken, verifyToken } = require("./auth")
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
} = require("./db")

require('dotenv').config()

const HTTP_PORT = 8000

// Initialize express
var app = express()
app.use(express.json())
app.use(cors({ origin: true }))

// Create the resumes database
const dbResumes = new sqlite3.Database('resumes.db', (err) => {
    if(err){
        console.error("Error opening database:",err.message)
    } else {
        console.log("Connected to resumes.db")
    }
})

// Create the accounts database
const dbAccounts = new sqlite3.Database('accounts.db', (err) => {
    if(err){
        console.error("Error opening database:",err.message)
    } else {
        console.log("Connected to accounts.db")
    }
})

// Start express
app.listen(HTTP_PORT,() => {
    initializeDatabase(dbResumes, dbAccounts) // Initialize DBs

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

// Post endpoint for login. Needs username and password in body json
app.post("/api/login/", async (req, res) => {

    // Get and check for username and password
    const username = req.body?.username
    const password = req.body?.password
    if (!username) {
        return res.status(400).json({ error: "Username is required" })
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required" })
    }

    // Check if user exists in DB
    if(!(await verifyUserExists(dbAccounts, username))){
        return res.status(404).json({ error: "User not found" })
    }

    // Compare given password with password hash of user in DB
    const passwordHash = await getUserPasswordHash(dbAccounts, username)

    if (!passwordHash) {
        return res.status(500).json({ error: "Failed to retrieve user information" })
    }

    if (!(await comparePassword(password, passwordHash))) {
        return res.status(401).json({ error: "Invalid password" })
    }

    // Generate new JWT token
    const token = generateToken(username)
    res.status(200).json({ token })
})

// Post endpoint to register a new user. Needs a username and password in body json
app.post("/api/register/", async (req, res) => {
    // Check if username and password was given
    const username = req.body?.username
    const password = req.body?.password
    if (!username) {
        return res.status(400).json({ error: "Username is required" })
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required" })
    }

    // Check if the user exists already
    if(await verifyUserExists(dbAccounts, username)){
        return res.status(409).json({ error: "Username already exists" })
    }

    // Hash password and register user in DB
    const passwordHash = await hashPassword(password)
    try {
        await registerUser(dbAccounts, username, passwordHash)
    } catch (err) {
        console.error("Error registering user:", err.message)
        return res.status(500).json({ error: "Failed to register user" })
    }

    const token = generateToken(username)
    res.status(200).json({ token })
})

// Post endpoint to logout. Removes the JWT from the user in the DB
app.post("/api/logout/", async (req, res) => {
    const jwtToken = req.headers?.authorization?.split(" ")[1] // Expecting "Bearer <token>"

    if(!jwtToken){
        return res.status(401).json({ error: "Authorization header with JWT token is required" })
    }

    // Check if JWT is valid
    const verifiedToken = await verifyToken(jwtToken)
    if(!verifiedToken){
        return res.status(403).json({ error: "Invalid token for the specified username" })
    }

    const username = verifiedToken.username

    // Remove JWT from DB
    try {
        await revokeToken(dbAccounts, username)
        res.status(200).json({ message: "Logout successful" })
    } catch (err) {
        console.error("Error during logout:", err.message)
        res.status(500).json({ error: "Failed to logout user" })
    }
})

// GET endpoint for getting the users resume data. Requires JWT
app.get("/api/resume/", async (req, res) => {
    const jwtToken = req.headers?.authorization?.split(" ")[1] // Expecting "Bearer <token>"

    if(!jwtToken){
        return res.status(401).json({ error: "Authorization header with JWT token is required" })
    }

    const verifiedToken = await verifyToken(jwtToken)
    if(!verifiedToken){
        return res.status(403).json({ error: "Invalid token for the specified username" })
    }

    // Get user from JWT
    const username = verifiedToken.username

    // Check if user has resume data and return it if so
    if(await verifyUserExists(dbAccounts, username)){
        try {
            const resumeData = await getResume(dbResumes, username)
            res.status(200).json({ resume: resumeData })
        } catch (err) {
            console.error("Error retrieving resume:", err.message)
            res.status(500).json({ error: "Failed to retrieve resume" })
        }
    } else {
        res.status(404).json({ error: "User not found" })
    }
})

//POST endpoint to save resume data. Requires JWT and resume data in body json
app.post("/api/save/", async (req, res) => {
  const jwtToken = req.headers?.authorization?.split(" ")[1] // Expecting "Bearer <token>"

  if (!jwtToken) {
    return res.status(401).json({ error: "Authorization header with JWT token is required" })
  }

  const verifiedToken = verifyToken(jwtToken)
  if (!verifiedToken) {
    return res.status(403).json({ error: "Invalid token for the specified username" })
  }

  // Get resume data
  const resumeContent = req.body.content

  // Save resume data in DB
  if(await saveResume(dbResumes, resumeContent)){
    res.status(200).json({ message: "Resume saved successfully" })
  } else {
    res.status(500).json({ error: "Failed to save resume" })
  }
})

// POST endpoint to get gemini suggestion. Requires JWT. Also needs resume section, content, and api key in body json
app.post("/api/suggest/", async (req, res) => {
    const jwtToken = req.headers?.authorization?.split(" ")[1] // Expecting "Bearer <token>"

    if (!jwtToken) {
        return res.status(401).json({ error: "Authorization header with JWT token is required" })
    }

    const verifiedToken = verifyToken(jwtToken)
    if (!verifiedToken) {
        return res.status(403).json({ error: "Invalid token for the specified username" })
    }

    // Get resume data and api key
    const resume_section = req.body?.section
    const resume_content = req.body?.content
    const apiKey = req.body?.apiKey

    if (!apiKey) {
        return res.status(400).json({ error: "API key is required" })
    }

    // Create AI agent
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })
    
    if (!resume_section) {
        return res.status(400).json({ error: "Missing username or section in request body" })
    }

    // Construct prompt to only give HTML feedback
    const prompt = `Given the following resume content for the section "${resume_section}", provide suggestions to enhance it. The current content is: ${resume_content}. Please suggest improvements or additions that could make this section stronger and more compelling for potential employers. Focus on clarity, impact, and relevance to the job market. Make the entire response an HTML formatted response that can be directly inserted into the resume editor. Don't add any explanations or disclaimers, just provide the improved content.`

    // Generate response and return it
    try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        console.log("Generated content:", text)
        res.status(200).json({ suggestion: text })
    } catch (error) {
        console.error("Error generating content:", error)
        res.status(500).json({ error: "Failed to generate content" })
    }
})
