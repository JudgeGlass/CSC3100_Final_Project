// [ PARTIALLY written by me ]

// Immediately Invoked Function Expression to create a module for configuration constants. global in this case is the window object.
;(function (global) {
	global.ResumeApp = global.ResumeApp || {} // Create the ResumeApp namespace if it doesn't exist
	global.ResumeApp.API_BASE_URL = "http://localhost:8000/api" // Base URL for the backend API. Change this if your backend is hosted somewhere else.
})(window)
