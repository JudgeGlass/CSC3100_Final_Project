// **** [ Entire file written by me* ] ****
//      * except ensureResumeColumns() and part of saveResume() functions
// Some helper functions for the DBs

const sqlite3 = require('sqlite3').verbose()

// Initializes the DBs for the resume and account data
function initializeDatabase(dbResumes, dbAccounts) {
  function ensureResumeColumns() { // Ensures the resume DB has correct columns
      dbResumes.all("PRAGMA table_info(resumes)", (err, rows) => {
        if (err) {
          console.error("Error reading resumes table info:", err.message)
          return
        }
  
        const existing = new Set((rows || []).map((r) => r.name))
        const toAdd = [
          { name: "coverLetter", type: "TEXT" },
          { name: "selectedSkills", type: "TEXT" },
          { name: "selectedExperienceJobs", type: "TEXT" },
          { name: "experienceItems", type: "TEXT" },
          { name: "skillItems", type: "TEXT" },
          { name: "selectedExperienceIds", type: "TEXT" },
          { name: "selectedSkillIds", type: "TEXT" },
        ]
  
        for (const col of toAdd) {
          if (existing.has(col.name)) continue
          dbResumes.run(`ALTER TABLE resumes ADD COLUMN ${col.name} ${col.type}`, (alterErr) => {
            if (alterErr) {
              console.error(`Error adding column ${col.name}:`, alterErr.message)
            } else {
              console.log(`Added column ${col.name} to resumes table`)
            }
          })
        }
      })
    }
  
    // SQL for creating resume table
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
      skills TEXT,
      coverLetter TEXT,
      selectedSkills TEXT,
      selectedExperienceJobs TEXT,
      experienceItems TEXT,
      skillItems TEXT,
      selectedExperienceIds TEXT,
      selectedSkillIds TEXT
    )`

    // Execute the SQL statement to create the resume table
    dbResumes.run(createTableSql, (err) => {
        if (err) {
            return console.error('Error creating table:', err.message)
        }
        console.log('Table created successfully')
      ensureResumeColumns()
    })

  // SQL for creating accounts table
  const createAccountsTableSql = `
      CREATE TABLE IF NOT EXISTS accounts (
          username TEXT PRIMARY KEY NOT NULL,
          passwordHash TEXT NOT NULL,
          currentJWT TEXT
      )`

  // Execute the SQL statement to create the account table
  dbAccounts.run(createAccountsTableSql, (err) => {
      if (err) {
          return console.error('Error creating accounts table:', err.message)
      }
      console.log('Accounts table created successfully')
    })
}

// Inserts a new user into the account table
function registerUser(dbAccounts, username, passwordHash) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO accounts (username, passwordHash, currentJWT) VALUES (?, ?, NULL)`
        dbAccounts.run(sql, [username, passwordHash], function(err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    reject(new Error("Username already exists"))
                } else {
                    reject(err)
                }
            } else {
                resolve()
            }
         })
    })
}

// Get the password hash from a given user
function getUserPasswordHash(dbAccounts, username) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT passwordHash FROM accounts WHERE username = ?`
        dbAccounts.get(sql, [username], (err, row) => {
            if (err) {
                reject(err)
            } else if (!row) {
                reject(new Error("User not found"))
            } else {
                resolve(row.passwordHash)
            }
        })
    })
}

// Update the JWT for a given user
function updateUserToken(dbAccounts, username, token) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE accounts SET currentJWT = ? WHERE username = ?`
        dbAccounts.run(sql, [token, username], function(err) {
            if (err) {
                reject(err)
            } else if (this.changes === 0) {
                reject(new Error("User not found"))
            } else {
                resolve()
            }
         })
    })
}

// Get JWT for given user
function getUserToken(dbAccounts, username) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT currentJWT FROM accounts WHERE username = ?`
        dbAccounts.get(sql, [username], (err, row) => {
            if (err) {
                reject(err)
            } else if (!row) {
                reject(new Error("User not found"))
            } else {
                resolve(row.currentJWT)
            }
        })
    })
}

// Check if user exists in table
function verifyUserExists(dbAccounts, username) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT 1 FROM accounts WHERE username = ?`
        dbAccounts.get(sql, [username], (err, row) => {
            if (err) {
                reject(err)
            } else if (!row) {
                resolve(false)
            } else {
                resolve(true)
            }
        })
    })
}

// Remove JWT for given user
function revokeToken(dbAccounts, username) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE accounts SET currentJWT = NULL WHERE username = ?`
        dbAccounts.run(sql, [username], function(err) {
            if (err) {
                reject(err)
            } else if (this.changes === 0) {
                reject(new Error("User not found"))
            } else {
                resolve()
            }
         })
    })
}

// Saves all the resume data in table
function saveResume(dbResumes, resumeContent) {
  const selectedSkills = Array.isArray(resumeContent.selectedSkills)
    ? JSON.stringify(resumeContent.selectedSkills)
    : resumeContent.selectedSkills ?? null
  const selectedExperienceJobs = Array.isArray(resumeContent.selectedExperienceJobs)
    ? JSON.stringify(resumeContent.selectedExperienceJobs)
    : resumeContent.selectedExperienceJobs ?? null
  const experienceItems = Array.isArray(resumeContent.experienceItems)
    ? JSON.stringify(resumeContent.experienceItems)
    : resumeContent.experienceItems ?? null
  const skillItems = Array.isArray(resumeContent.skillItems)
    ? JSON.stringify(resumeContent.skillItems)
    : resumeContent.skillItems ?? null
  const selectedExperienceIds = Array.isArray(resumeContent.selectedExperienceIds)
    ? JSON.stringify(resumeContent.selectedExperienceIds)
    : resumeContent.selectedExperienceIds ?? null
  const selectedSkillIds = Array.isArray(resumeContent.selectedSkillIds)
    ? JSON.stringify(resumeContent.selectedSkillIds)
    : resumeContent.selectedSkillIds ?? null

  // This giant SQL query...
  const sql = `INSERT INTO resumes (username, fullName, headline, email, phone, location, website, summary, experience, education, projects, skills, coverLetter, selectedSkills, selectedExperienceJobs, experienceItems, skillItems, selectedExperienceIds, selectedSkillIds)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                   skills=excluded.skills,
				   coverLetter=excluded.coverLetter,
				   selectedSkills=excluded.selectedSkills,
           selectedExperienceJobs=excluded.selectedExperienceJobs,
           experienceItems=excluded.experienceItems,
           skillItems=excluded.skillItems,
           selectedExperienceIds=excluded.selectedExperienceIds,
           selectedSkillIds=excluded.selectedSkillIds`

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
    resumeContent.skills,
	resumeContent.coverLetter,
	selectedSkills,
  selectedExperienceJobs,
  experienceItems,
  skillItems,
  selectedExperienceIds,
  selectedSkillIds
  ]

  return new Promise((resolve, reject) => {
    dbResumes.run(sql, params, function(err) {
      if (err) {
        reject(err)
      } else {
        resolve(true)
      }
    })
  })
}

// Get resume data for given user. Check if selected experience/skills is valid json and set empty if not
function getResume(dbResumes, username) {
  const sql = `SELECT * FROM resumes WHERE username = ?`
  return new Promise((resolve, reject) => {
    dbResumes.get(sql, [username], (err, row) => {
      if (err) {
        reject(err)
      } else if (!row) {
        resolve(null)
      } else {
        // Parse JSON fields back into arrays
        if (row.selectedSkills) {
          try {
            row.selectedSkills = JSON.parse(row.selectedSkills)
          } catch (e) {
            console.error("Error parsing selectedSkills:", e)
            row.selectedSkills = []
          }
        }
        if (row.selectedExperienceJobs) {
          try {
            row.selectedExperienceJobs = JSON.parse(row.selectedExperienceJobs)
          } catch (e) {
            console.error("Error parsing selectedExperienceJobs:", e)
            row.selectedExperienceJobs = []
          }
        }
        if (row.experienceItems) {
          try {
            row.experienceItems = JSON.parse(row.experienceItems)
          } catch (e) {
            console.error("Error parsing experienceItems:", e)
            row.experienceItems = []
          }
        }
        if (row.skillItems) {
          try {
            row.skillItems = JSON.parse(row.skillItems)
          } catch (e) {
            console.error("Error parsing skillItems:", e)
            row.skillItems = []
          }
        }
        if (row.selectedExperienceIds) {
          try {
            row.selectedExperienceIds = JSON.parse(row.selectedExperienceIds)
          } catch (e) {
            console.error("Error parsing selectedExperienceIds:", e)
            row.selectedExperienceIds = []
          }
        }
        if (row.selectedSkillIds) {
          try {
            row.selectedSkillIds = JSON.parse(row.selectedSkillIds)
          } catch (e) {
            console.error("Error parsing selectedSkillIds:", e)
            row.selectedSkillIds = []
          }
        }
        resolve(row)
      }
    })
  })
}

module.exports = {
    initializeDatabase,
    registerUser,
    getUserPasswordHash,
    updateUserToken,
    getUserToken,
    verifyUserExists,
    revokeToken,
    saveResume,
    getResume
}
