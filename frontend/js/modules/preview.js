;(function (global) {
	global.ResumeApp = global.ResumeApp || {}
	global.ResumeApp.preview = global.ResumeApp.preview || {}

	const { escapeHtml, isQuillEmpty, normalizeUrl, sanitizeHtml } = global.ResumeApp.utils

	function sectionHtml(title, innerHtml) {
		const sanitized = sanitizeHtml(innerHtml)
		const content = sanitized.trim()
		if (!content || content === "<p><br></p>") return ""
		return `<h2>${escapeHtml(title)}</h2>${content}`
	}

	function createPreviewRenderer({ inputs, quills, selectionState }) {
		return function renderPreview() {
			const previewEl = document.getElementById("divResumePreview")
			if (!previewEl) return

			console.log("Rendering preview...")
			const fullName = (inputs.fullName?.value ?? "").trim()
			const headline = (inputs.headline?.value ?? "").trim()
			const email = (inputs.email?.value ?? "").trim()
			const phone = (inputs.phone?.value ?? "").trim()
			const location = (inputs.location?.value ?? "").trim()
			const website = (inputs.website?.value ?? "").trim()

			const contactBits = []
			if (email) {
				contactBits.push(
					`<a href="mailto:${encodeURIComponent(email)}" class="text-decoration-none">${escapeHtml(email)}</a>`
				)
			}
			if (phone) contactBits.push(escapeHtml(phone))
			if (location) contactBits.push(escapeHtml(location))
			if (website) {
				const url = normalizeUrl(website)
				contactBits.push(
					`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" class="text-decoration-none">${escapeHtml(
						website
					)}</a>`
				)
			}

			const headerHtml = `
				<div class="mb-3">
					<h1 class="mb-0">${escapeHtml(fullName || "Your Name")}</h1>
					${headline ? `<div class="text-muted">${escapeHtml(headline)}</div>` : ""}
					${
						contactBits.length
							? `<div class="small text-muted mt-2">${contactBits.join(" · ")}</div>`
							: ""
					}
				</div>
			`

			const summaryHtml = isQuillEmpty(quills.summary) ? "" : sectionHtml("Summary", quills.summary.root.innerHTML)

			const coverLetterHtml = isQuillEmpty(quills.coverLetter)
				? ""
				: sectionHtml("Cover Letter", quills.coverLetter.root.innerHTML)

			let experienceHtml = ""
			if (!isQuillEmpty(quills.experience)) {
				const selectedBlocks = selectionState.options.experience.filter((o) => selectionState.experienceIds.has(o.id))
				if (selectionState.options.experience.length && selectedBlocks.length === 0) {
					experienceHtml = ""
				} else if (selectedBlocks.length && selectedBlocks.length !== selectionState.options.experience.length) {
					experienceHtml = sectionHtml("Experience", selectedBlocks.map((b) => b.html).join(""))
				} else {
					experienceHtml = sectionHtml("Experience", quills.experience.root.innerHTML)
				}
			}

			const educationHtml = isQuillEmpty(quills.education) ? "" : sectionHtml("Education", quills.education.root.innerHTML)
			const projectsHtml = isQuillEmpty(quills.projects) ? "" : sectionHtml("Projects", quills.projects.root.innerHTML)

			let skillsHtml = ""
			if (!isQuillEmpty(quills.skills)) {
				const selectedSkills = selectionState.options.skills.filter((o) => selectionState.skillIds.has(o.id))
				if (selectionState.options.skills.length && selectedSkills.length === 0) {
					skillsHtml = ""
				} else if (selectedSkills.length && selectedSkills.length !== selectionState.options.skills.length) {
					skillsHtml = sectionHtml(
						"Skills",
						`<ul>${selectedSkills.map((s) => `<li>${escapeHtml(s.label)}</li>`).join("")}</ul>`
					)
				} else {
					skillsHtml = sectionHtml("Skills", quills.skills.root.innerHTML)
				}
			}

			previewEl.innerHTML = `${headerHtml}${coverLetterHtml}${summaryHtml}${experienceHtml}${educationHtml}${projectsHtml}${skillsHtml}`
		}
	}

	global.ResumeApp.preview.createPreviewRenderer = createPreviewRenderer
})(window)
