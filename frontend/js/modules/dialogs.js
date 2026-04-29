;(function (global) {
	global.ResumeApp = global.ResumeApp || {}
	global.ResumeApp.dialogs = global.ResumeApp.dialogs || {}

	function showDialog({ title, text, icon } = {}) {
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

	global.ResumeApp.dialogs.showDialog = showDialog
	global.ResumeApp.dialogs.showErrorDialog = showErrorDialog
	global.ResumeApp.dialogs.showWarningDialog = showWarningDialog
	global.ResumeApp.dialogs.showSuccessDialog = showSuccessDialog
})(window)
