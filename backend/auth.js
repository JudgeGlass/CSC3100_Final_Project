const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

async function hashPassword(password) {
    const saltRounds = 10
    return await bcrypt.hash(password, saltRounds)
}

async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash)
}

function generateToken(username) {
    const payload = {
        username: username
    }

    const options = {
      expiresIn: '1h', // Token expires in 1 hour
    }

    const secret = process.env.JWT_SECRET || 'defaultsecret'

    return jwt.sign(payload, secret, options)
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret')
    return decoded
  } catch (err) {
    throw new Error('Invalid token')
  }
}

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken
}