// [ Written entirely by me ]
// Some helper functions to show sweetalert2 dialogs

// Immediately Invoked Function Expression. global in this case is the window object.
// Used to create a module like pattern.
;(function (global) {
	global.ResumeApp = global.ResumeApp || {} // Create the ResumeApp namespace if it doesn't exist
	global.ResumeApp.dialogs = global.ResumeApp.dialogs || {} // Create the dialogs namespace if it doesn't exist

	function showDialog({ title, text, icon } = {}) {
		// Check if the sweetalert2 librarly loaded properly
		if (typeof Swal !== "undefined" && typeof Swal.fire === "function") {
			return Swal.fire({
				title: title || "",
				text: text || "",
				icon: icon || "info",
			})
		}
		// Fall back to alert if SweetAlert2 is not available
		alert(`${title ? `${title}: ` : ""}${text || ""}`.trim())
	}

	function showErrorDialog(title, text, error) {
		console.error(title || "Error", error)
		return showDialog({ title: title || "Error", text: text || "Something went wrong.", icon: "error" })
	}

	function showWarningDialog(title, text) {
		return showDialog({ title: title || "Attention", text: text || "", icon: "warning" })
	}

	function showSuccessDialog(title, text) {
		return showDialog({ title: title || "Success", text: text || "", icon: "success" })
	}

	function showInfoDialog(title, text) {
		return showDialog({title: title || "Info", text: text || "", icon: "info"})
	}

	// Expose the dialog functions to the global ResumeApp.dialogs namespace
	global.ResumeApp.dialogs.showDialog = showDialog
	global.ResumeApp.dialogs.showInfoDialog = showInfoDialog
	global.ResumeApp.dialogs.showErrorDialog = showErrorDialog
	global.ResumeApp.dialogs.showWarningDialog = showWarningDialog
	global.ResumeApp.dialogs.showSuccessDialog = showSuccessDialog
})(window)
