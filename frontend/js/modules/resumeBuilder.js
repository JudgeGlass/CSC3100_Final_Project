;(function (global) {
	global.ResumeApp = global.ResumeApp || {}
	global.ResumeApp.resumeBuilder = global.ResumeApp.resumeBuilder || {}

	const API_BASE_URL = global.ResumeApp.API_BASE_URL
	const { showErrorDialog } = global.ResumeApp.dialogs
	const { getGeminiApiKey, getJwtToken, getUsername, setGeminiApiKey } = global.ResumeApp.session
	const { enhanceQuillAccessibility } = global.ResumeApp.quillA11y
	const { isQuillEmpty, safeJsonParse, setQuillHtml } = global.ResumeApp.utils
	const { createPreviewRenderer } = global.ResumeApp.preview
	const { createSelectionManager } = global.ResumeApp.selection

	let initialized = false
	let inputs = null
	let generateButtons = null
	let quills = null
	let selectionManager = null
	let renderPreview = () => {}

	let txtApiKey = null
	let btnSave = null
	let btnPrint = null

	const toolbarOptions = [
		[{ header: [1, 2, 3, 4, 5, false] }],
		["bold", "italic", "underline"],
		[{ list: "ordered" }, { list: "bullet" }],
		["link"],
		["clean"],
	]

	const quillSectionLabels = {
		summary: "Summary",
		experience: "Experience",
		education: "Education",
		projects: "Projects",
		skills: "Skills",
		coverLetter: "Cover Letter",
	}

	function disableGenerateButtons() {
		for (const btn of Object.values(generateButtons)) {
			if (!btn) continue
			btn.textContent = "Generating..."
			btn.disabled = true
		}
	}

	function enableGenerateButtons() {
		for (const btn of Object.values(generateButtons)) {
			if (!btn) continue
			btn.textContent = "Enhance with AI"
			btn.disabled = false
		}
	}

	async function getSuggestion(section) {
		disableGenerateButtons()

		if (isQuillEmpty(quills[section])) {
			if (typeof Swal !== "undefined" && typeof Swal.fire === "function") {
				Swal.fire({
					title: "Input Required",
					text: "Please enter some content in the section before requesting AI suggestions.",
					icon: "warning",
				})
			} else {
				alert("Please enter some content in the section before requesting AI suggestions.")
			}
			enableGenerateButtons()
			return
		}

		const body = {
			section,
			apiKey: getGeminiApiKey(),
			content: quills[section].root.innerHTML,
		}

		try {
			const response = await fetch(`${API_BASE_URL}/suggest/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${getJwtToken() || ""}`,
				},
				body: JSON.stringify(body),
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const result = await response.json()
			console.log("Suggestion retrieved successfully:", result)
			enableGenerateButtons()

			if (typeof Swal === "undefined" || typeof Swal.fire !== "function") {
				alert("AI suggestions are available, but SweetAlert2 is not loaded.")
				return
			}

			Swal.fire({
				title: "AI Suggestions",
				html: "<div id='suggestion-content' class='quill-editor'></div>",
				icon: "info",
				confirmButtonText: "Apply Suggestions",
				width: "75%",
				showCancelButton: true,
				didOpen: () => {
					const suggestionContainer = document.getElementById("suggestion-content")
					if (suggestionContainer) {
						const tempQuill = new Quill(suggestionContainer, {
							theme: "snow",
							modules: { toolbar: false },
							readOnly: true,
						})
						enhanceQuillAccessibility(tempQuill, { label: "AI suggestions", editorIdPrefix: "ai-suggestions" })
						setQuillHtml(tempQuill, result.suggestion || "<p>No suggestions were generated. Please try again.</p>")
					}
				},
			}).then((swalResult) => {
				if (swalResult.isConfirmed && result.suggestion) {
					setQuillHtml(quills[section], result.suggestion)
					renderPreview()
				}
			})
		} catch (error) {
			console.error("Error retrieving suggestion:", error)
			enableGenerateButtons()
			showErrorDialog("Failed to retrieve AI suggestions", "Please try again later.", error)
		}
	}

	async function getResume() {
		try {
			const response = await fetch(`${API_BASE_URL}/resume/`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${getJwtToken() || ""}`,
				},
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = await response.json()
			console.log("Resume data retrieved:", data)

			// Backend returns: { resume: { ...fields } }
			const resume = data?.resume ?? null
			if (!resume) {
				console.log("No saved resume found for this user yet.")
				return
			}

			inputs.fullName.value = resume.fullName || ""
			inputs.headline.value = resume.headline || ""
			inputs.email.value = resume.email || ""
			inputs.phone.value = resume.phone || ""
			inputs.location.value = resume.location || ""
			inputs.website.value = resume.website || ""
			setQuillHtml(quills.summary, resume.summary || "<p><br></p>")
			setQuillHtml(quills.experience, resume.experience || "<p><br></p>")
			setQuillHtml(quills.education, resume.education || "<p><br></p>")
			setQuillHtml(quills.projects, resume.projects || "<p><br></p>")
			setQuillHtml(quills.skills, resume.skills || "<p><br></p>")
			setQuillHtml(quills.coverLetter, resume.coverLetter || "<p><br></p>")

			selectionManager.setLoadedSelections({
				experienceLabels: safeJsonParse(resume.selectedExperienceJobs, null),
				skillLabels: safeJsonParse(resume.selectedSkills, null),
			})
		} catch (error) {
			showErrorDialog("Failed to load resume", "Please refresh the page and try again.", error)
		}
	}

	async function saveResume() {
		console.log("Saving resume...")

		const selectedExperienceLabels = selectionManager.selectionState.options.experience
			.filter((o) => selectionManager.selectionState.experienceIds.has(o.id))
			.map((o) => o.label)
		const selectedSkillLabels = selectionManager.selectionState.options.skills
			.filter((o) => selectionManager.selectionState.skillIds.has(o.id))
			.map((o) => o.label)

		const resumeData = {
			username: getUsername() || "unknown_user",
			fullName: inputs.fullName.value,
			headline: inputs.headline.value,
			email: inputs.email.value,
			phone: inputs.phone.value,
			location: inputs.location.value,
			website: inputs.website.value,
			summary: quills.summary.root.innerHTML,
			experience: quills.experience.root.innerHTML,
			education: quills.education.root.innerHTML,
			projects: quills.projects.root.innerHTML,
			skills: quills.skills.root.innerHTML,
			coverLetter: quills.coverLetter.root.innerHTML,
			selectedExperienceJobs: selectedExperienceLabels,
			selectedSkills: selectedSkillLabels,
		}

		try {
			const response = await fetch(`${API_BASE_URL}/save/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${getJwtToken() || ""}`,
				},
				body: JSON.stringify({ content: resumeData }),
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const result = await response.json()
			console.log("Resume saved successfully:", result)
		} catch (error) {
			showErrorDialog("Failed to save resume", "Please try again.", error)
		}
	}

	function initOnce() {
		if (initialized) return

		inputs = {
			fullName: document.getElementById("fullName"),
			headline: document.getElementById("headline"),
			email: document.getElementById("email"),
			phone: document.getElementById("phone"),
			location: document.getElementById("location"),
			website: document.getElementById("website"),
		}

		txtApiKey = document.querySelector("#txtApiKey")
		btnSave = document.querySelector("#btnSave")
		btnPrint = document.querySelector("#btnPrint")

		generateButtons = {
			summary: document.getElementById("btnGenerateSummary"),
			experience: document.getElementById("btnGenerateExperience"),
			education: document.getElementById("btnGenerateEducation"),
			projects: document.getElementById("btnGenerateProjects"),
			skills: document.getElementById("btnGenerateSkills"),
			coverLetter: document.getElementById("btnGenerateCoverLetter"),
		}

		if (typeof Quill === "undefined") {
			// Quill didn't load; nothing to initialize.
			return
		}

		quills = {
			summary: new Quill("#summaryEditor", {
				theme: "snow",
				modules: { toolbar: toolbarOptions },
				placeholder: "A short professional summary…",
			}),
			experience: new Quill("#experienceEditor", {
				theme: "snow",
				modules: { toolbar: toolbarOptions },
				placeholder: "Role, company, dates, and bullet points…",
			}),
			education: new Quill("#educationEditor", {
				theme: "snow",
				modules: { toolbar: toolbarOptions },
				placeholder: "School, degree, dates, highlights…",
			}),
			projects: new Quill("#projectsEditor", {
				theme: "snow",
				modules: { toolbar: toolbarOptions },
				placeholder: "Project name, impact, tech used…",
			}),
			skills: new Quill("#skillsEditor", {
				theme: "snow",
				modules: { toolbar: toolbarOptions },
				placeholder: "Skills list or categories…",
			}),
			coverLetter: new Quill("#coverLetterEditor", {
				theme: "snow",
				modules: { toolbar: toolbarOptions },
				placeholder: "A short cover letter tailored to the role…",
			}),
		}

		for (const [key, quill] of Object.entries(quills)) {
			enhanceQuillAccessibility(quill, { label: quillSectionLabels[key] || key, editorIdPrefix: key })
		}

		selectionManager = createSelectionManager({
			quills,
			containers: {
				experience: document.getElementById("experienceSelection"),
				skills: document.getElementById("skillsSelection"),
			},
			renderPreview: () => renderPreview(),
		})

		renderPreview = createPreviewRenderer({ inputs, quills, selectionState: selectionManager.selectionState })

		generateButtons.summary?.addEventListener("click", () => getSuggestion("summary"))
		generateButtons.experience?.addEventListener("click", () => getSuggestion("experience"))
		generateButtons.education?.addEventListener("click", () => getSuggestion("education"))
		generateButtons.projects?.addEventListener("click", () => getSuggestion("projects"))
		generateButtons.skills?.addEventListener("click", () => getSuggestion("skills"))
		generateButtons.coverLetter?.addEventListener("click", () => getSuggestion("coverLetter"))

		btnSave?.addEventListener("click", saveResume)

		btnPrint?.addEventListener("click", () => {
			renderPreview()
			window.print()
		})

		txtApiKey?.addEventListener("input", () => {
			setGeminiApiKey(txtApiKey.value)
		})

		for (const input of Object.values(inputs)) {
			input?.addEventListener("input", () => renderPreview())
		}

		for (const [key, quill] of Object.entries(quills)) {
			quill.on("text-change", () => {
				if (key === "experience" || key === "skills") {
					selectionManager.syncSelectionsFromContent()
				}
				renderPreview()
			})
		}

		initialized = true
	}

	function clearInputs() {
		if (!inputs) {
			// Not initialized yet; nothing to clear.
			return
		}
		inputs.fullName.value = ""
		inputs.headline.value = ""
		inputs.email.value = ""
		inputs.phone.value = ""
		inputs.location.value = ""
		inputs.website.value = ""
		if (quills) {
			for (const quill of Object.values(quills)) {
				if (quill) quill.setContents([{ insert: "\n" }], "silent")
			}
		}
		selectionManager?.resetSelections()
	}

	async function renderPage() {
		initOnce()
		if (!quills) return

		if (txtApiKey) txtApiKey.value = getGeminiApiKey() || ""

		await getResume()
		selectionManager.syncSelectionsFromContent({ initialLoad: true })
		renderPreview()
	}

	global.ResumeApp.resumeBuilder.renderPage = renderPage
	global.ResumeApp.resumeBuilder.clearInputs = clearInputs
})(window)
