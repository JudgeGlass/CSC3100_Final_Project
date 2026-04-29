;(function (global) {
	global.ResumeApp = global.ResumeApp || {}
	global.ResumeApp.quillA11y = global.ResumeApp.quillA11y || {}

	function enhanceQuillAccessibility(quill, { label, editorIdPrefix } = {}) {
		if (!quill) return
		const sectionLabel = String(label || "Editor").trim() || "Editor"

		// Ensure the editable area has a stable id and accessible name.
		const editorEl = quill?.root
		if (editorEl) {
			if (!editorEl.id) {
				const safePrefix = String(editorIdPrefix || sectionLabel)
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/(^-|-$)/g, "")
				editorEl.id = `${safePrefix || "quill"}-editor`
			}
			editorEl.setAttribute("role", "textbox")
			editorEl.setAttribute("aria-multiline", "true")
			editorEl.setAttribute("aria-label", `${sectionLabel} editor`)
		}

		const toolbarModule = quill.getModule?.("toolbar")
		const toolbarEl = toolbarModule?.container
		if (!toolbarEl) return

		toolbarEl.setAttribute("role", "toolbar")
		toolbarEl.setAttribute("aria-label", `${sectionLabel} formatting toolbar`)
		if (editorEl?.id) toolbarEl.setAttribute("aria-controls", editorEl.id)

		const setButtonA11y = (selector, ariaLabel, extra = {}) => {
			const btn = toolbarEl.querySelector(selector)
			if (!btn) return null
			btn.setAttribute("aria-label", ariaLabel)
			btn.setAttribute("title", ariaLabel)
			if (editorEl?.id) btn.setAttribute("aria-controls", editorEl.id)
			for (const [key, value] of Object.entries(extra)) {
				btn.setAttribute(key, String(value))
			}
			return btn
		}

		const setSelectA11y = (selector, ariaLabel) => {
			const el = toolbarEl.querySelector(selector)
			if (!el) return null
			el.setAttribute("aria-label", ariaLabel)
			if (editorEl?.id) el.setAttribute("aria-controls", editorEl.id)
			return el
		}

		// Buttons present in your toolbarOptions.
		setButtonA11y("button.ql-bold", "Bold", { "aria-keyshortcuts": "Control+B Meta+B" })
		setButtonA11y("button.ql-italic", "Italic", { "aria-keyshortcuts": "Control+I Meta+I" })
		setButtonA11y("button.ql-underline", "Underline", { "aria-keyshortcuts": "Control+U Meta+U" })
		setButtonA11y('button.ql-list[value="ordered"]', "Numbered list")
		setButtonA11y('button.ql-list[value="bullet"]', "Bulleted list")
		setButtonA11y("button.ql-link", "Insert link")
		setButtonA11y("button.ql-clean", "Remove formatting")
		setSelectA11y("select.ql-header", "Heading level")
	}

	global.ResumeApp.quillA11y.enhanceQuillAccessibility = enhanceQuillAccessibility
})(window)
