// [ PARTIALLY written by me ]
// Functions that handle the preivew of the resume

// Immediately Invoked Function Expression to create a module for resume preview logic. global in this case is the window object.
;(function (global) {
	global.ResumeApp = global.ResumeApp || {} // Create the ResumeApp namespace if it doesn't exist
	global.ResumeApp.preview = global.ResumeApp.preview || {} // Create the preview namespace if it doesn't exist

	// Get html sanitizer helpers from the utils module
	const { escapeHtml, isQuillEmpty, normalizeUrl, sanitizeHtml } = global.ResumeApp.utils

	// sectionHtml() [ Written entirely by me ]
	// Creates the resume section (education, skills, etc) html
	function sectionHtml(title, innerHtml) {
		const sanitized = sanitizeHtml(innerHtml)
		const content = sanitized.trim()
		if (!content || content === "<p><br></p>") return "" // Return nothing if the section is empty
		return `<h2>${escapeHtml(title)}</h2>${content}`
	}

	// createPreviewRenderer() [ Written entirely by me ]
	// Creates the resume preivew
	function createPreviewRenderer({ inputs, quills, selectionState }) {
		return function renderPreview() {
			const previewEl = document.getElementById("divResumePreview") // Get preview div
			if (!previewEl) return

			console.log("Rendering preview...")
			// Get basic info inputs
			const fullName = (inputs.fullName?.value ?? "").trim()
			const headline = (inputs.headline?.value ?? "").trim()
			const email = (inputs.email?.value ?? "").trim()
			const phone = (inputs.phone?.value ?? "").trim()
			const location = (inputs.location?.value ?? "").trim()
			const website = (inputs.website?.value ?? "").trim()

			// Create list of the contact info(s)
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

			// Create the resume header
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
			// Create the summary section
			const summaryHtml = isQuillEmpty(quills.summary)
				? ""
				: sectionHtml("Summary", quills.summary.root.innerHTML)

			// Create the cover letter section
			const coverLetterHtml = isQuillEmpty(quills.coverLetter)
				? ""
				: sectionHtml("Cover Letter", quills.coverLetter.root.innerHTML)

			const selectedExperience = (selectionState?.options?.experience || []).filter((item) =>	selectionState?.experienceIds?.has(item.id))
			const experienceHtml = selectedExperience.length ? sectionHtml("Experience", selectedExperience.map((item) => item.html).join("")) : ""

			// Create education and projects sections
			const educationHtml = isQuillEmpty(quills.education) ? ""	: sectionHtml("Education", quills.education.root.innerHTML)
			const projectsHtml = isQuillEmpty(quills.projects) ? "" : sectionHtml("Projects", quills.projects.root.innerHTML)

			console.log("WTH IS THIS: ", selectionState?.options?.skills)
			console.log("Then this?: ", selectionState?.skillIds)
			// Filters the array "skills" to whatever ID is in the Set "skillIds"
			const selectedSkills = (selectionState?.options?.skills || []).filter((item) =>	selectionState?.skillIds?.has(item.id))
			const skillsHtml = selectedSkills.length ? sectionHtml("Skills", `<ul>${selectedSkills.map((item) => `<li>${escapeHtml(item.label)}</li>`).join("")}</ul>`) : ""

			// Combine all the section html
			previewEl.innerHTML = `${headerHtml}${coverLetterHtml}${summaryHtml}${experienceHtml}${educationHtml}${projectsHtml}${skillsHtml}`
		}
	}

	global.ResumeApp.preview.createPreviewRenderer = createPreviewRenderer // Expose the createPreviewRenderer function to the global ResumeApp.preview namespace
})(window)
