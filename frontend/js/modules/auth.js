
// Immediately Invoked Function Expression to create a module for authentication logic. global in this case is the window object.
;(function (global) {
	global.ResumeApp = global.ResumeApp || {} // Create the ResumeApp namespace if it doesn't exist
	global.ResumeApp.auth = global.ResumeApp.auth || {} // Create the auth namespace if it doesn't exist

	const API_BASE_URL = global.ResumeApp.API_BASE_URL
	const { showErrorDialog, showSuccessDialog, showWarningDialog } = global.ResumeApp.dialogs
	const { clearAuthSession, getJwtToken, setJwtToken, setUsername } = global.ResumeApp.session

	// login() [ Written entirely by me ]
	// Takes the given username and password and calls the backend for a JWT token
	async function login(username, password) {
		console.log("Attempting login for user:", username)
		const response = await fetch(`${API_BASE_URL}/login/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ username, password }),
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result = await response.json()
		console.log("Login successful:", result)
		setJwtToken(result.token) // Set the jwt token into session storage
		setUsername(username) // Set the user in session storage for later
	}

	// register() [ Written entirely by me ]
	// Takes the given username and password and calls the backend to register a new user.
	async function register(username, password) {
		console.log("Attempting registration for user:", username)
		const response = await fetch(`${API_BASE_URL}/register/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ username, password }),
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result = await response.json()
		console.log("Registration successful:", result)
		await showSuccessDialog("Registration successful", "Please log in with your new credentials.")
	}

	// logout() [ Written entirely by me ]
	// Sendss a post to the backend to revoke the users JWT, then clears the session storage.
	async function logout() {
		const token = getJwtToken() || ""
		try {
			const response = await fetch(`${API_BASE_URL}/logout/`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
		} catch (error) {
			showErrorDialog("Logout failed", "Could not reach the server to log out.", error)
		}

		clearAuthSession()
	}

	// showLogin() [ Written entirely by me ]
	// Hides everything except login div
	function showLogin(divLogin, divRegister, divMain) {
		divMain?.classList.add("hidden")
		divRegister?.classList.add("hidden")
		divLogin?.classList.remove("hidden")
	}

	// showRegister() [ Written entirely by me ]
	// Hides everything except register div
	function showRegister(divLogin, divRegister) {
		divLogin?.classList.add("hidden")
		divRegister?.classList.remove("hidden")
	}

	// showMain() [ Written entirely by me ]
	// Hides everything except main application div
	function showMain(divLogin, divRegister, divMain) {
		divLogin?.classList.add("hidden")
		divRegister?.classList.add("hidden")
		divMain?.classList.remove("hidden")
	}

	// initAuth() [ PARTIALLY written by me ]
	// Function that gets called from 'app.js'. Handles all the login/register logic and adds event listeners to ui.
	function initAuth({ onLoggedIn, onLoggedOut } = {}) {
		// Get the login/register buttons
		const btnLogin = document.querySelector("#btnLogin")
		const btnRegister = document.querySelector("#btnRegister")
		const btnBackToLogin = document.querySelector("#btnBackToLogin")
		const btnRegisterSubmit = document.querySelector("#btnRegisterSubmit")
		const btnLogout = document.querySelector("#btnLogout")

		// Get the login/register input fields
		const txtUsernameLogin = document.querySelector("#txtUsernameLogin")
		const txtPasswordLogin = document.querySelector("#txtPasswordLogin")
		const txtUsernameRegister = document.querySelector("#txtRegisterUsername")
		const txtPasswordRegister = document.querySelector("#txtRegisterPassword")

		// Get the divs of the application parts/"pages" (login, register, main application)
		const divLogin = document.querySelector("#divLogin")
		const divRegister = document.querySelector("#divRegister")
		const divMain = document.querySelector("#divMain")

		// Show registration when "Register" button clicked
		btnRegister?.addEventListener("click", () => {
			showRegister(divLogin, divRegister)
		})


		// Show registration when "Back to login" button clicked
		btnBackToLogin?.addEventListener("click", () => {
			showLogin(divLogin, divRegister, divMain)
		})

		// Call login routine when clicking "Login" button
		btnLogin?.addEventListener("click", async () => {
			const username = txtUsernameLogin?.value?.trim() || ""
			const password = txtPasswordLogin?.value?.trim() || ""
			
			if (!username || !password) { // Check for username and password
				showWarningDialog("Input required", "Please enter both username and password.")
				return
			}

			try {
				await login(username, password) // Call backend to login, throw if login failed
				showMain(divLogin, divRegister, divMain) // Show the main application "page"
				await onLoggedIn?.() // Call callback function once logged in
			} catch (error) {
				showErrorDialog("Login failed", "Please check your credentials and try again.", error)
			}
		})

		// Login when enter key pressed on username or password input
		const enterTriggersLogin = (e) => {
			if (e.key === "Enter") btnLogin?.click()
		}
		txtUsernameLogin?.addEventListener("keypress", enterTriggersLogin)
		txtPasswordLogin?.addEventListener("keypress", enterTriggersLogin)

		// Register user when "Register" button clicked
		btnRegisterSubmit?.addEventListener("click", async () => {
			const username = txtUsernameRegister?.value?.trim() || ""
			const password = txtPasswordRegister?.value?.trim() || ""

			// Check if username/password is there
			if (!username || !password) {
				showWarningDialog("Input required", "Please enter both username and password.")
				return
			}

			try {
				await register(username, password) // Call the backend to register user
				await login(username, password) // Call the backend to login the new user
				showMain(divLogin, divRegister, divMain) // Show main page
				await onLoggedIn?.() // Call the callback function once logged in (renders the page)
				// Clear registration fields after successful registration and login
				if (txtUsernameRegister) txtUsernameRegister.value = ""
				if (txtPasswordRegister) txtPasswordRegister.value = ""
				// Clear login fields as well
				if (txtUsernameLogin) txtUsernameLogin.value = ""
				if (txtPasswordLogin) txtPasswordLogin.value = ""
				// Show success dialog after successful registration and login
				await showSuccessDialog("Welcome!", `You have successfully registered and logged in as ${username}.`)
				console.log("User registered and logged in successfully:", username)
			} catch (error) {
				showErrorDialog("Registration failed", "Please try again.", error)
			}
		})

		// Logs the user out when clicking the "Logout" button
		btnLogout?.addEventListener("click", async () => {
			await logout() // Call backend to revoke jwt
			onLoggedOut?.() // Call callback function once logged out (clears the inputs)
			showLogin(divLogin, divRegister, divMain)
		})

		// Restore existing session if token exists.
		const token = getJwtToken()
		console.log("Checking for existing JWT token on page load:", token ? "Token found" : "No token found")
		if (token) {
			;(async () => {
				try {
					showMain(divLogin, divRegister, divMain)
					await onLoggedIn?.()
				} catch (error) {
					showErrorDialog("Session expired", "Please log in again.", error)
					clearAuthSession()
					showLogin(divLogin, divRegister, divMain)
				}
			})()
		}
	}

	global.ResumeApp.auth.initAuth = initAuth // Expose the initAuth function to the global ResumeApp.auth namespace
})(window)
