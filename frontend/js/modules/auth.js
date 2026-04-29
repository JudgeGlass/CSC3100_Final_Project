;(function (global) {
	global.ResumeApp = global.ResumeApp || {}
	global.ResumeApp.auth = global.ResumeApp.auth || {}

	const API_BASE_URL = global.ResumeApp.API_BASE_URL
	const { showErrorDialog, showSuccessDialog, showWarningDialog } = global.ResumeApp.dialogs
	const { clearAuthSession, getJwtToken, setJwtToken, setUsername } = global.ResumeApp.session

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
		setJwtToken(result.token)
		setUsername(username)
	}

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

	function showLogin(divLogin, divRegister, divMain) {
		divMain?.classList.add("hidden")
		divRegister?.classList.add("hidden")
		divLogin?.classList.remove("hidden")
	}

	function showRegister(divLogin, divRegister) {
		divLogin?.classList.add("hidden")
		divRegister?.classList.remove("hidden")
	}

	function showMain(divLogin, divRegister, divMain) {
		divLogin?.classList.add("hidden")
		divRegister?.classList.add("hidden")
		divMain?.classList.remove("hidden")
	}

	function initAuth({ onLoggedIn, onLoggedOut } = {}) {
		const btnLogin = document.querySelector("#btnLogin")
		const btnRegister = document.querySelector("#btnRegister")
		const btnBackToLogin = document.querySelector("#btnBackToLogin")
		const btnRegisterSubmit = document.querySelector("#btnRegisterSubmit")
		const btnLogout = document.querySelector("#btnLogout")

		const txtUsernameLogin = document.querySelector("#txtUsernameLogin")
		const txtPasswordLogin = document.querySelector("#txtPasswordLogin")
		const txtUsernameRegister = document.querySelector("#txtRegisterUsername")
		const txtPasswordRegister = document.querySelector("#txtRegisterPassword")

		const divLogin = document.querySelector("#divLogin")
		const divRegister = document.querySelector("#divRegister")
		const divMain = document.querySelector("#divMain")

		btnRegister?.addEventListener("click", () => {
			showRegister(divLogin, divRegister)
		})

		btnBackToLogin?.addEventListener("click", () => {
			divRegister?.classList.add("hidden")
			divLogin?.classList.remove("hidden")
		})

		btnLogin?.addEventListener("click", async () => {
			const username = txtUsernameLogin?.value?.trim() || ""
			const password = txtPasswordLogin?.value?.trim() || ""
			if (!username || !password) {
				showWarningDialog("Input required", "Please enter both username and password.")
				return
			}
			try {
				await login(username, password)
				showMain(divLogin, divRegister, divMain)
				await onLoggedIn?.()
			} catch (error) {
				showErrorDialog("Login failed", "Please check your credentials and try again.", error)
			}
		})

		const enterTriggersLogin = (e) => {
			if (e.key === "Enter") btnLogin?.click()
		}
		txtUsernameLogin?.addEventListener("keypress", enterTriggersLogin)
		txtPasswordLogin?.addEventListener("keypress", enterTriggersLogin)

		btnRegisterSubmit?.addEventListener("click", async () => {
			const username = txtUsernameRegister?.value?.trim() || ""
			const password = txtPasswordRegister?.value?.trim() || ""
			if (!username || !password) {
				showWarningDialog("Input required", "Please enter both username and password.")
				return
			}
			try {
				await register(username, password)
				btnBackToLogin?.click()
			} catch (error) {
				showErrorDialog("Registration failed", "Please try again.", error)
			}
		})

		btnLogout?.addEventListener("click", async () => {
			await logout()
			onLoggedOut?.()
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

	global.ResumeApp.auth.initAuth = initAuth
})(window)
