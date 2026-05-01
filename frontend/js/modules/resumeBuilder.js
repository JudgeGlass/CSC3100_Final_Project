// Immediately Invoked Function Expression to create a module for the resume builder logic. global in this case is the window object.
;(function (global) {
	global.ResumeApp = global.ResumeApp || {} // Create the ResumeApp namespace if it doesn't exist
	global.ResumeApp.resumeBuilder = global.ResumeApp.resumeBuilder || {} // Create the resumeBuilder namespace if it doesn't exist

	const API_BASE_URL = global.ResumeApp.API_BASE_URL
	const { showErrorDialog, showWarningDialog, showInfoDialog } = global.ResumeApp.dialogs
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
	let btnAddExperienceItem = null
	let btnAddSkillItem = null

	// Available options for the quill inputs
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

	// [ Written entirely by me ]
	// Disables all the generate buttons while the AI agent is working
	function disableGenerateButtons() {
		for (const btn of Object.values(generateButtons)) {
			if (!btn) continue
			btn.textContent = "Generating..."
			btn.disabled = true
		}
	}

	// [ Written entirely by me ]
	// Enable all the generate buttons
	function enableGenerateButtons() {
		for (const btn of Object.values(generateButtons)) {
			if (!btn) continue
			btn.textContent = "Enhance with AI"
			btn.disabled = false
		}
	}

	// [ Written entirely by me ]
	// Calls the backend to get the AI suggestion for a given resume section
	async function getSuggestion(section) {
		disableGenerateButtons() // Disable generate buttons to prevent multiple backend calls
		
		// Check if given resume section is empty and show warning dialog if so
		if (isQuillEmpty(quills[section])) {
			showWarningDialog("Input Required", "Please enter some content in the section before requesting AI suggestions.")
			enableGenerateButtons()
			return
		}

		// Construct backend request body: section we are asking about, gemini api key and section content
		const body = {
			section,
			apiKey: getGeminiApiKey(),
			content: quills[section].root.innerHTML,
		}

		try {
			// Make request to backend
			const response = await fetch(`${API_BASE_URL}/suggest/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${getJwtToken() || ""}`, // Attach JWT
				},
				body: JSON.stringify(body),
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const result = await response.json() // Store result
			console.log("Suggestion retrieved successfully:", result)
			enableGenerateButtons() // Re-enable generate buttons

			// Ensure sweetalert2 is loaded
			if (typeof Swal === "undefined" || typeof Swal.fire !== "function") {
				alert("AI suggestions are available, but SweetAlert2 is not loaded.")
				return
			}

			// Create a custom sweetalert2 dialog that show the suggestion with quill input
			Swal.fire({
				title: "AI Suggestions",
				html: "<div id='divSuggestion' class='quill-editor'></div>",
				icon: "info",
				confirmButtonText: "Apply Suggestions",
				width: "75%",
				showCancelButton: true,
				didOpen: () => { // Load quill input once dialog appears
					const suggestionContainer = document.getElementById("divSuggestion")
					if (suggestionContainer) {
						const tempQuill = new Quill(suggestionContainer, {
							theme: "snow",
							modules: { toolbar: false },
							readOnly: true,
						})
						enhanceQuillAccessibility(tempQuill, { label: "AI suggestions", editorIdPrefix: "ai-suggestions" }) // Add aria labels to quill input
						setQuillHtml(tempQuill, result.suggestion || "<p>No suggestions were generated. Please try again.</p>") // Put suggestion in quill input
					}
				},
			}).then((swalResult) => {
				// Check if user selects confirm and apply suggestion if so
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

	// [ Written entirely by me ]
	// Calls the backend to get the resume data for the user based on their JWT
	async function getResume() {
		// Make request for resume data
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

			const data = await response.json() // Store resume data
			console.log("Resume data retrieved:", data)
			selectionManager.resetSelections()

			const resume = data?.resume ?? null // Resume data is under the 'resume' key of json
			if (!resume) {
				console.log("No saved resume found for this user yet.")
				return
			}

			// Set all the inputs with the resume data
			inputs.fullName.value = resume.fullName || ""
			inputs.headline.value = resume.headline || ""
			inputs.email.value = resume.email || ""
			inputs.phone.value = resume.phone || ""
			inputs.location.value = resume.location || ""
			inputs.website.value = resume.website || ""
			setQuillHtml(quills.summary, resume.summary || "<p><br></p>")
			setQuillHtml(quills.experience, "<p><br></p>")
			setQuillHtml(quills.education, resume.education || "<p><br></p>")
			setQuillHtml(quills.projects, resume.projects || "<p><br></p>")
			setQuillHtml(quills.skills, "<p><br></p>")
			setQuillHtml(quills.coverLetter, resume.coverLetter || "<p><br></p>")

			// Get the experience and skills entries and their ids
			const experienceItems = safeJsonParse(resume.experienceItems, null)
			const skillItems = safeJsonParse(resume.skillItems, null)
			const selectedExperienceIds = safeJsonParse(resume.selectedExperienceIds, null)
			const selectedSkillIds = safeJsonParse(resume.selectedSkillIds, null)

			// Update the selection manager
			selectionManager.setLoadedSelections({
				experienceItems,
				skillItems,
				selectedExperienceIds,
				selectedSkillIds,
			})
		} catch (error) {
			showErrorDialog("Failed to load resume", "Please refresh the page and try again.", error)
		}
	}

	// [ Written entirely by me ]
	// Calls the backend to save the resume data
	async function saveResume() {
		console.log("Saving resume...")

		// Get the skills and experience with their ids. Also the selected ones
		const selectedExperienceIds = Array.from(selectionManager.selectionState.experienceIds)
		const selectedSkillIds = Array.from(selectionManager.selectionState.skillIds)
		const experienceItems = selectionManager.selectionState.options.experience
		const skillItems = selectionManager.selectionState.options.skills
		const allExperienceHtml = experienceItems.map((item) => item.html).join("")
		const allSkillsHtml = skillItems.length ? `<ul>${skillItems.map((item) => `<li>${item.label}</li>`).join("")}</ul>`	: "<p><br></p>"

		// Construct the "payload" of all the data
		const resumeData = {
			username: getUsername() || "unknown_user",
			fullName: inputs.fullName.value,
			headline: inputs.headline.value,
			email: inputs.email.value,
			phone: inputs.phone.value,
			location: inputs.location.value,
			website: inputs.website.value,
			summary: quills.summary.root.innerHTML,
			experience: allExperienceHtml || "<p><br></p>",
			education: quills.education.root.innerHTML,
			projects: quills.projects.root.innerHTML,
			skills: allSkillsHtml,
			coverLetter: quills.coverLetter.root.innerHTML,
			experienceItems,
			skillItems,
			selectedExperienceIds,
			selectedSkillIds,
		}

		// Make the request
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

	// [ PARTIALLY written by me ]
	// Initializes all the inputs/html on page load
	function initOnce() {
		if (initialized) return

		// Object of all the basic info inputs
		inputs = {
			fullName: document.getElementById("fullName"),
			headline: document.getElementById("headline"),
			email: document.getElementById("email"),
			phone: document.getElementById("phone"),
			location: document.getElementById("location"),
			website: document.getElementById("website"),
		}

		// Resume section buttons and api key input
		txtApiKey = document.querySelector("#txtApiKey")
		btnSave = document.querySelector("#btnSave")
		btnPrint = document.querySelector("#btnPrint")
		btnAddExperienceItem = document.querySelector("#btnAddExperienceItem")
		btnAddSkillItem = document.querySelector("#btnAddSkillItem")

		// Object of all the generate buttosn for each section
		generateButtons = {
			summary: document.getElementById("btnGenerateSummary"),
			experience: document.getElementById("btnGenerateExperience"),
			education: document.getElementById("btnGenerateEducation"),
			projects: document.getElementById("btnGenerateProjects"),
			skills: document.getElementById("btnGenerateSkills"),
			coverLetter: document.getElementById("btnGenerateCoverLetter"),
		}

		// Check if Quill initialized
		if (typeof Quill === "undefined") {
			return
		}

		// Object of all the quill inputs
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

		// Add the aria-* to each of the quill inputs
		for (const [key, quill] of Object.entries(quills)) {
			enhanceQuillAccessibility(quill, { label: quillSectionLabels[key] || key, editorIdPrefix: key })
		}

		// Create the manager for handling the selection of experiences/skills
		selectionManager = createSelectionManager({
			quills,
			containers: {
				experience: document.getElementById("experienceSelection"),
				skills: document.getElementById("skillsSelection"),
			},
			renderPreview: () => renderPreview(),
		})

		// Create the resume previewer
		renderPreview = createPreviewRenderer({ inputs, quills, selectionState: selectionManager.selectionState })

		// Add click event listeners to all the ai generate buttons
		generateButtons.summary?.addEventListener("click", () => getSuggestion("summary"))
		generateButtons.experience?.addEventListener("click", () => getSuggestion("experience"))
		generateButtons.education?.addEventListener("click", () => getSuggestion("education"))
		generateButtons.projects?.addEventListener("click", () => getSuggestion("projects"))
		generateButtons.skills?.addEventListener("click", () => getSuggestion("skills"))
		generateButtons.coverLetter?.addEventListener("click", () => getSuggestion("coverLetter"))

		// Add click event listener to save button
		btnSave?.addEventListener("click", saveResume)

		// Add click event listener to add job button
		btnAddExperienceItem?.addEventListener("click", () => {
			const didAdd = selectionManager.addExperienceFromEditor() // Add job to the preview
			if (!didAdd) { // Check if it was added and if not, the quill input was empty
				showInfoDialog("Nothing to add", "Type a job entry in Experience first, then click + Add Job.")
			}
		})

		// Add click event listener to add skill button
		btnAddSkillItem?.addEventListener("click", () => {
			const didAdd = selectionManager.addSkillFromEditor() // Add job to the preview
			if (!didAdd) { // Check if it was added and if not, the quill input was empty
				showInfoDialog("Nothing to add", "Type a skill entry in Skills first, then click + Add Skill.")
			}
		})

		// Ensure resume preview is rendered, the show print dialog
		btnPrint?.addEventListener("click", () => {
			renderPreview()
			window.print()
		})

		// Store gemini api key
		txtApiKey?.addEventListener("input", () => {
			setGeminiApiKey(txtApiKey.value)
		})

		// Update preview after each key input on input
		for (const input of Object.values(inputs)) {
			input?.addEventListener("input", () => renderPreview())
		}

		// Update preview after each key input on quill input
		for (const [key, quill] of Object.entries(quills)) {
			quill.on("text-change", () => {
				renderPreview()
			})
		}

		initialized = true
	}

	// [ Written entirely by me ]
	// Clears all input data when user logs out
	function clearInputs() {
		if (!inputs) {
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

	// [ Written entirely by me ]
	// Renders the page
	async function renderPage() {
		initOnce() // Build the page
		if (!quills) return

		if (txtApiKey) txtApiKey.value = getGeminiApiKey() || "" // Fill in gemini api key if it exists

		await getResume() // Get users resume
		selectionManager.syncSelectionsFromContent({ initialLoad: true }) // Update selections based on fetched resume
		renderPreview() // Show preivew
	}

	global.ResumeApp.resumeBuilder.renderPage = renderPage // Expose the renderPage function to the global ResumeApp.resumeBuilder namespace
	global.ResumeApp.resumeBuilder.clearInputs = clearInputs // Expose the clearInputs function to the global ResumeApp.resumeBuilder namespace
})(window)
