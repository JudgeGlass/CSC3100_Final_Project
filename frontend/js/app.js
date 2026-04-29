document.addEventListener("DOMContentLoaded", () => {
	const app = window.ResumeApp
	app?.auth?.initAuth({
		onLoggedIn: app?.resumeBuilder?.renderPage,
		onLoggedOut: app?.resumeBuilder?.clearInputs,
	})
})
