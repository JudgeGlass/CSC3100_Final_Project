// **** [ Written ENTIRELY by AI] ****
// I've put comments explaining (hopefully) what everything does
// Copilot suggested that I "sanitize" the Quill input since it supports rich text.
// This prevents scripts, iframes, embeds, etc from being stored in the db. It also converts
// common symbols like "&" or ">" to the html equivalents to avoid conflicts. Finally, it has
// some helper functions for making the experience and skills sections selectable. 
// Used copilot to fix it

// Immediately Invoked Function Expression to create a module for general utility functions. global in this case is the window object.
;(function (global) {
	global.ResumeApp = global.ResumeApp || {} // Create the ResumeApp namespace if it doesn't exist
	global.ResumeApp.utils = global.ResumeApp.utils || {} // Create the utils namespace if it doesn't exist

	// Replaces certain symbols with HTML escape sequences to avoid conflicts
	function escapeHtml(text) {
		return String(text)
			.replaceAll("&", "&amp")
			.replaceAll("<", "&lt")
			.replaceAll(">", "&gt")
			.replaceAll('"', "&quot")
			.replaceAll("'", "&#039")
	}

	// Removes certain "hazardous" tags from being rendered/stored in the db
	function sanitizeHtml(html) {
		const template = document.createElement("template")
		template.innerHTML = String(html ?? "")

		const blockedTags = new Set(["script", "iframe", "object", "embed"])
		const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT)

		const nodesToRemove = []
		while (walker.nextNode()) {
			const el = walker.currentNode
			if (blockedTags.has(el.tagName.toLowerCase())) {
				nodesToRemove.push(el)
				continue
			}

			for (const attr of Array.from(el.attributes)) {
				const name = attr.name.toLowerCase()
				const value = attr.value
				if (name.startsWith("on")) {
					el.removeAttribute(attr.name)
					continue
				}
				if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
					el.removeAttribute(attr.name)
				}
			}
		}
		for (const el of nodesToRemove) el.remove()

		return template.innerHTML
	}

	// Puts 'https://' in front of URLs if it doesn't have it already
	function normalizeUrl(url) {
		const raw = String(url ?? "").trim()
		if (!raw) return ""
		if (/^https?:\/\//i.test(raw)) return raw
		return `https://${raw}`
	}

	// Check if Quill input is empty or not
	function isQuillEmpty(quill) {
		return quill.getText().trim().length === 0
	}

	// Ensures the given 'value' is valid json and returns a 'fallback' if not (I have it set to null for everything)
	function safeJsonParse(value, fallback) {
		try {
			if (value == null) return fallback
			if (typeof value === "object") return value
			const parsed = JSON.parse(value)
			return parsed ?? fallback
		} catch {
			return fallback
		}
	}

	// Remove extra spacing from text
	function normalizeText(text) {
		return String(text ?? "")
			.replace(/\s+/g, " ")
			.trim()
	}

	// Used for the selection logic. Creates a unique ID for a given string
	function stableHash(input) {
		// djb2
		let hash = 5381
		const str = String(input ?? "")
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
		}
		return (hash >>> 0).toString(36)
	}

	function optionId(prefix, label, extra = "") {
		return `${prefix}_${stableHash(`${label}|${extra}`)}`
	}

	// Set the quill input content html. Have to use clipboard convert for it to render html correctly.
	function setQuillHtml(quill, html) {
		const safeHtml = sanitizeHtml(html)
		const delta = quill.clipboard.convert(safeHtml)
		quill.setContents(delta, "silent")
	}

	// Creates a "root" html node called <template> for the given html so it can be parsed and sanitized
	function htmlToTemplate(html) {
		const template = document.createElement("template")
		template.innerHTML = sanitizeHtml(html)
		return template
	}

	// Expose the utility functions to the global ResumeApp.utils namespace
	global.ResumeApp.utils.escapeHtml = escapeHtml
	global.ResumeApp.utils.sanitizeHtml = sanitizeHtml
	global.ResumeApp.utils.normalizeUrl = normalizeUrl
	global.ResumeApp.utils.isQuillEmpty = isQuillEmpty
	global.ResumeApp.utils.safeJsonParse = safeJsonParse
	global.ResumeApp.utils.normalizeText = normalizeText
	global.ResumeApp.utils.stableHash = stableHash
	global.ResumeApp.utils.optionId = optionId
	global.ResumeApp.utils.setQuillHtml = setQuillHtml
	global.ResumeApp.utils.htmlToTemplate = htmlToTemplate
})(window)
