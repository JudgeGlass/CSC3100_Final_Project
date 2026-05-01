document.addEventListener("DOMContentLoaded", () => {
	const app = window.ResumeApp // Get the global ResumeApp namespace where all modules are attached
	app?.auth?.initAuth({
		onLoggedIn: app?.resumeBuilder?.renderPage,
		onLoggedOut: app?.resumeBuilder?.clearInputs,
	})
})
