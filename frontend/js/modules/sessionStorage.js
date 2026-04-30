// [ Written entirely by me ]
// Some basic helper functions to store things in session storage
;(function (global) {
	global.ResumeApp = global.ResumeApp || {}
	global.ResumeApp.session = global.ResumeApp.session || {}

	const TOKEN_KEY = "jwtToken"
	const USERNAME_KEY = "username"
	const GEMINI_KEY = "geminiApiKey"

	function getJwtToken() {
		return sessionStorage.getItem(TOKEN_KEY)
	}

	function setJwtToken(token) {
		sessionStorage.setItem(TOKEN_KEY, token)
	}

	function clearJwtToken() {
		sessionStorage.removeItem(TOKEN_KEY)
	}

	function getUsername() {
		return sessionStorage.getItem(USERNAME_KEY)
	}

	function setUsername(username) {
		sessionStorage.setItem(USERNAME_KEY, username)
	}

	function clearUsername() {
		sessionStorage.removeItem(USERNAME_KEY)
	}

	function getGeminiApiKey() {
		return sessionStorage.getItem(GEMINI_KEY) || ""
	}

	function setGeminiApiKey(apiKey) {
		const value = String(apiKey || "").trim()
		if (value) sessionStorage.setItem(GEMINI_KEY, value)
		else sessionStorage.removeItem(GEMINI_KEY)
	}

	function clearAuthSession() {
		clearJwtToken()
		clearUsername()
	}

	global.ResumeApp.session.getJwtToken = getJwtToken
	global.ResumeApp.session.setJwtToken = setJwtToken
	global.ResumeApp.session.clearJwtToken = clearJwtToken
	global.ResumeApp.session.getUsername = getUsername
	global.ResumeApp.session.setUsername = setUsername
	global.ResumeApp.session.clearUsername = clearUsername
	global.ResumeApp.session.getGeminiApiKey = getGeminiApiKey
	global.ResumeApp.session.setGeminiApiKey = setGeminiApiKey
	global.ResumeApp.session.clearAuthSession = clearAuthSession
})(window)
