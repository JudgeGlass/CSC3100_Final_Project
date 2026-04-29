const sqlite3 = require('sqlite3').verbose()


function initializeDatabase(dbResumes, dbAccounts) {
  function ensureResumeColumns() {
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
        selectedExperienceJobs TEXT
      )`
  
      // Execute the SQL statement to create the table
      dbResumes.run(createTableSql, (err) => {
          if (err) {
              return console.error('Error creating table:', err.message)
          }
          console.log('Table created successfully')
        ensureResumeColumns()
      })

  const createAccountsTableSql = `
      CREATE TABLE IF NOT EXISTS accounts (
          username TEXT PRIMARY KEY NOT NULL,
          passwordHash TEXT NOT NULL,
          currentJWT TEXT
      )`

  dbAccounts.run(createAccountsTableSql, (err) => {
      if (err) {
          return console.error('Error creating accounts table:', err.message)
      }
      console.log('Accounts table created successfully')
    })
}

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


function saveResume(dbResumes, resumeContent) {
  const selectedSkills = Array.isArray(resumeContent.selectedSkills)
    ? JSON.stringify(resumeContent.selectedSkills)
    : resumeContent.selectedSkills ?? null
  const selectedExperienceJobs = Array.isArray(resumeContent.selectedExperienceJobs)
    ? JSON.stringify(resumeContent.selectedExperienceJobs)
    : resumeContent.selectedExperienceJobs ?? null

  const sql = `INSERT INTO resumes (username, fullName, headline, email, phone, location, website, summary, experience, education, projects, skills, coverLetter, selectedSkills, selectedExperienceJobs)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
				   selectedExperienceJobs=excluded.selectedExperienceJobs`

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
	selectedExperienceJobs
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
