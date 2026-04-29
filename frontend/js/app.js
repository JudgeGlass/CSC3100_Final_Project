const btnLogin = document.querySelector("#btnLogin")
const btnRegister = document.querySelector("#btnRegister")
const btnBackToLogin = document.querySelector("#btnBackToLogin")
const btnRegisterSubmit = document.querySelector("#btnRegisterSubmit")
const btnLogout = document.querySelector("#btnLogout")
const txtUsernameLogin = document.querySelector("#txtUsernameLogin")
const txtPasswordLogin = document.querySelector("#txtPasswordLogin")
const txtUsernameRegister = document.querySelector("#txtRegisterUsername")
const txtPasswordRegister = document.querySelector("#txtRegisterPassword")
const txtApiKey = document.querySelector("#txtApiKey")
const divLogin = document.querySelector("#divLogin")
const divRegister = document.querySelector("#divRegister")
const divMain = document.querySelector("#divMain")

function showDialog({ title, text, icon }) {
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

btnRegister?.addEventListener("click", async () => {
	divLogin.classList.add("hidden")
	divRegister.classList.remove("hidden")
})

btnBackToLogin?.addEventListener("click", async () => {
	divRegister.classList.add("hidden")
	divLogin.classList.remove("hidden")
})

async function login(username, password) {
	try {
		console.log("Attempting login for user:", username)
		const response = await fetch(`http://localhost:8000/api/login/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ username, password })
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result = await response.json()
		console.log("Login successful:", result)
		// Store the token and proceed to the main app
		sessionStorage.setItem("jwtToken", result.token)
		sessionStorage.setItem("username", username)
		divLogin.classList.add("hidden")
		divMain.classList.remove("hidden")
		await renderPage()
	} catch (error) {
		showErrorDialog(
			"Login failed",
			"Please check your credentials and try again.",
			error
		)
	}
}

async function register(username, password) {
	try {
		console.log("Attempting registration for user:", username)
		const response = await fetch(`http://localhost:8000/api/register/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ username, password })
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result = await response.json()
		console.log("Registration successful:", result)
		await showSuccessDialog(
			"Registration successful",
			"Please log in with your new credentials."
		)
		divRegister.classList.add("hidden")
		divLogin.classList.remove("hidden")
	} catch (error) {
		showErrorDialog("Registration failed", "Please try again.", error)
	}
}

btnLogin?.addEventListener("click", async () => {
	const username = txtUsernameLogin.value.trim()
	const password = txtPasswordLogin.value.trim()
	if (!username || !password) {
		showWarningDialog("Input required", "Please enter both username and password.")
		return
	}
	await login(username, password)
})

txtPasswordLogin?.addEventListener("keypress", async (e) => {
	if (e.key === "Enter") {
		btnLogin.click()
	}
})

txtUsernameLogin?.addEventListener("keypress", async (e) => {
	if (e.key === "Enter") {
		btnLogin.click()
	}
})

btnRegisterSubmit?.addEventListener("click", async () => {
	const username = txtUsernameRegister.value.trim()
	const password = txtPasswordRegister.value.trim()
	if (!username || !password) {
		showWarningDialog("Input required", "Please enter both username and password.")
		return
	}
	// For this example, we'll just log the registration info.
	// In a real app, you'd send this to the backend to create the account.
	await register(username, password)
	btnBackToLogin.click()
})

btnLogout?.addEventListener("click", async () => {
	try {
		const response = await fetch(`http://localhost:8000/api/logout/`, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${sessionStorage.getItem("jwtToken")}`
			}
		})
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
	} catch (error) {
		showErrorDialog("Logout failed", "Could not reach the server to log out.", error)
	}

	sessionStorage.removeItem("jwtToken")
	sessionStorage.removeItem("username")
	divMain.classList.add("hidden")
	divLogin.classList.remove("hidden")
})

txtApiKey?.addEventListener("input", () => {
	const apiKey = txtApiKey.value.trim()
	if (apiKey) {
		sessionStorage.setItem("geminiApiKey", apiKey)
	} else {
		sessionStorage.removeItem("geminiApiKey")
	}
})


document.addEventListener("DOMContentLoaded", async function(){
    //....
		const token = sessionStorage.getItem("jwtToken")
		console.log("Checking for existing JWT token on page load:", token ? "Token found" : "No token found")
		
		if (token) {
			try {
				divLogin.classList.add("hidden")
				divMain.classList.remove("hidden")
				await renderPage()
			} catch (error) {
				showErrorDialog(
					"Session expired",
					"Please log in again.",
					error
				)
				// If there's an error (e.g., token is invalid), clear it and show login
				sessionStorage.removeItem("jwtToken")
				sessionStorage.removeItem("username")
				divMain.classList.add("hidden")
				divLogin.classList.remove("hidden")
			}
		}
})


const inputs = {
		fullName: document.getElementById("fullName"),
		headline: document.getElementById("headline"),
		email: document.getElementById("email"),
		phone: document.getElementById("phone"),
		location: document.getElementById("location"),
		website: document.getElementById("website"),
	}

const generateButtons = {
		summary: document.getElementById("btnGenerateSummary"),
		experience: document.getElementById("btnGenerateExperience"),
		education: document.getElementById("btnGenerateEducation"),
		projects: document.getElementById("btnGenerateProjects"),
		skills: document.getElementById("btnGenerateSkills"),
		coverLetter: document.getElementById("btnGenerateCoverLetter"),
}

generateButtons.summary.addEventListener("click", () => getSuggestion("summary"))
generateButtons.experience.addEventListener("click", () => getSuggestion("experience"))
generateButtons.education.addEventListener("click", () => getSuggestion("education"))
generateButtons.projects.addEventListener("click", () => getSuggestion("projects"))
generateButtons.skills.addEventListener("click", () => getSuggestion("skills"))
generateButtons.coverLetter?.addEventListener("click", () => getSuggestion("coverLetter"))

const toolbarOptions = [
		[{ header: [1, 2, 3, 4, 5, false] }],
		["bold", "italic", "underline"],
		[{ list: "ordered" }, { list: "bullet" }],
		["link"],
		["clean"],
	]

const btnSave = document.querySelector("#btnSave")
btnSave.addEventListener("click", saveResume)

const btnPrint = document.querySelector("#btnPrint")
btnPrint?.addEventListener("click", () => {
	// Ensure the preview is up-to-date before printing.
	renderPreview()
	window.print()
})

const quills = {
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

const selectionContainers = {
		experience: document.getElementById("experienceSelection"),
		skills: document.getElementById("skillsSelection"),
}

const loadedSelections = {
		experienceLabels: null,
		skillLabels: null,
}

const selectionState = {
		experienceIds: new Set(),
		skillIds: new Set(),
		hasUserInteracted: {
			experience: false,
			skills: false,
		},
		options: {
			experience: [],
			skills: [],
		},
}

function setQuillHtml(quill, html) {
	const safeHtml = sanitizeHtml(html)
	const delta = quill.clipboard.convert(safeHtml)
	quill.setContents(delta, "silent")
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

async function getSuggestion(section){
	disableGenerateButtons()

	if(isQuillEmpty(quills[section])){
		Swal.fire({
			title: "Input Required",
			text: "Please enter some content in the section before requesting AI suggestions.",
			icon: "warning",
		})
		enableGenerateButtons()
		return
	}


	const body = {
		section,
		apiKey: sessionStorage.getItem("geminiApiKey") || "",
		content: quills[section].root.innerHTML
	}

	try {
		const response = await fetch(`http://localhost:8000/api/suggest/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${sessionStorage.getItem("jwtToken") || ""}`,
			},
			body: JSON.stringify(body)
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result = await response.json()
		console.log("Suggestion retrieved successfully:", result)
		enableGenerateButtons()

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
					setQuillHtml(tempQuill, result.suggestion || "<p>No suggestions were generated. Please try again.</p>")
				}
			}
		}).then((swalResult) => {
			if (swalResult.isConfirmed && result.suggestion) {
				setQuillHtml(quills[section], result.suggestion)
				renderPreview()
			}
		})
	} catch (error) {
		console.error("Error retrieving suggestion:", error)
		enableGenerateButtons()
		showErrorDialog(
			"Failed to retrieve AI suggestions",
			"Please try again later.",
			error
		)
	}
}

async function get_resume(){
	try {
		const response = await fetch(`http://localhost:8000/api/resume/`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${sessionStorage.getItem("jwtToken") || ""}`,
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

		loadedSelections.experienceLabels = safeJsonParse(resume.selectedExperienceJobs, null)
		loadedSelections.skillLabels = safeJsonParse(resume.selectedSkills, null)
	} catch (error) {
		showErrorDialog(
			"Failed to load resume",
			"Please refresh the page and try again.",
			error
		)
	}
}

function escapeHtml(text) {
	return String(text)
		.replaceAll("&", "&amp")
		.replaceAll("<", "&lt")
		.replaceAll(">", "&gt")
		.replaceAll('"', "&quot")
		.replaceAll("'", "&#039")
}

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

function normalizeUrl(url) {
	const raw = String(url ?? "").trim()
	if (!raw) return ""
	if (/^https?:\/\//i.test(raw)) return raw
	return `https://${raw}`
}

function isQuillEmpty(quill) {
	return quill.getText().trim().length === 0
}

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

function normalizeText(text) {
	return String(text ?? "")
		.replace(/\s+/g, " ")
		.trim()
}

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

function htmlToTemplate(html) {
	const template = document.createElement("template")
	template.innerHTML = sanitizeHtml(html)
	return template
}

function extractSkillsOptions(skillsHtml) {
	const template = htmlToTemplate(skillsHtml)
	const liNodes = Array.from(template.content.querySelectorAll("li"))
	let labels = []

	if (liNodes.length) {
		labels = liNodes.map((li) => normalizeText(li.textContent)).filter(Boolean)
	} else {
		const text = normalizeText(template.content.textContent || "")
		if (text) {
			labels = text
				.split(/\n|,|·|\||\/|•/g)
				.map((t) => normalizeText(t))
				.filter(Boolean)
		}
	}

	const seen = new Set()
	const unique = []
	for (const label of labels) {
		const key = label.toLowerCase()
		if (seen.has(key)) continue
		seen.add(key)
		unique.push(label)
	}

	return unique.map((label) => ({
		id: optionId("skill", label),
		label,
	}))
}

function isBlankParagraphNode(node) {
	if (!node || node.nodeType !== Node.ELEMENT_NODE) return false
	if (node.tagName?.toLowerCase() !== "p") return false
	const html = node.innerHTML?.replace(/\s+/g, "").toLowerCase()
	return html === "<br>" || html === ""
}

function extractExperienceOptions(experienceHtml) {
	const template = htmlToTemplate(experienceHtml)
	const topNodes = Array.from(template.content.childNodes)
	const hasHeadings = template.content.querySelector("h1, h2, h3") != null

	const blocks = []
	let current = []
	let currentLabel = ""

	function pushCurrent() {
		if (!current.length) return
		const wrapper = document.createElement("div")
		for (const n of current) wrapper.appendChild(n.cloneNode(true))
		const blockHtml = wrapper.innerHTML
		const textKey = normalizeText(wrapper.textContent).slice(0, 200)
		const label = normalizeText(currentLabel) || normalizeText(textKey.split(" ").slice(0, 10).join(" ")) || "Experience"
		blocks.push({
			id: optionId("job", label, textKey),
			label,
			html: blockHtml,
		})
		current = []
		currentLabel = ""
	}

	if (hasHeadings) {
		for (const node of topNodes) {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const tag = node.tagName.toLowerCase()
				if (tag === "h1" || tag === "h2" || tag === "h3") {
					pushCurrent()
					currentLabel = normalizeText(node.textContent)
					current.push(node)
					continue
				}
			}
			current.push(node)
		}
		pushCurrent()
		return blocks.filter((b) => normalizeText(b.html).length > 0)
	}

	for (const node of topNodes) {
		if (isBlankParagraphNode(node)) {
			pushCurrent()
			continue
		}
		if (!current.length && node.nodeType === Node.ELEMENT_NODE) {
			currentLabel = normalizeText(node.textContent)
		}
		current.push(node)
	}
	pushCurrent()

	return blocks.filter((b) => normalizeText(b.html).length > 0)
}

function renderSelectionList(container, options, selectedIds, onChange) {
	if (!container) return
	if (!options.length) {
		container.innerHTML = `<div class="text-muted small">No items detected yet.</div>`
		return
	}

	container.innerHTML = ""
	for (const opt of options) {
		const row = document.createElement("div")
		row.className = "form-check"

		const input = document.createElement("input")
		input.className = "form-check-input"
		input.type = "checkbox"
		input.id = opt.id
		input.checked = selectedIds.has(opt.id)
		input.addEventListener("change", () => onChange(opt.id, input.checked))

		const label = document.createElement("label")
		label.className = "form-check-label"
		label.htmlFor = opt.id
		label.textContent = opt.label

		row.appendChild(input)
		row.appendChild(label)
		container.appendChild(row)
	}
}

function syncSelectionsFromContent({ initialLoad = false } = {}) {
	selectionState.options.experience = extractExperienceOptions(quills.experience.root.innerHTML)
	selectionState.options.skills = extractSkillsOptions(quills.skills.root.innerHTML)

	const experienceOptionIds = new Set(selectionState.options.experience.map((o) => o.id))
	const skillOptionIds = new Set(selectionState.options.skills.map((o) => o.id))

	// Experience selection
	if (!selectionState.hasUserInteracted.experience && selectionState.experienceIds.size === 0) {
		const desiredLabels = initialLoad ? loadedSelections.experienceLabels : null
		if (Array.isArray(desiredLabels) && desiredLabels.length) {
			const desired = new Set(desiredLabels.map((l) => normalizeText(l).toLowerCase()))
			for (const opt of selectionState.options.experience) {
				if (desired.has(normalizeText(opt.label).toLowerCase())) selectionState.experienceIds.add(opt.id)
			}
		} else {
			for (const id of experienceOptionIds) selectionState.experienceIds.add(id)
		}
	} else {
		selectionState.experienceIds = new Set([...selectionState.experienceIds].filter((id) => experienceOptionIds.has(id)))
	}

	// Skills selection
	if (!selectionState.hasUserInteracted.skills && selectionState.skillIds.size === 0) {
		const desiredLabels = initialLoad ? loadedSelections.skillLabels : null
		if (Array.isArray(desiredLabels) && desiredLabels.length) {
			const desired = new Set(desiredLabels.map((l) => normalizeText(l).toLowerCase()))
			for (const opt of selectionState.options.skills) {
				if (desired.has(normalizeText(opt.label).toLowerCase())) selectionState.skillIds.add(opt.id)
			}
		} else {
			for (const id of skillOptionIds) selectionState.skillIds.add(id)
		}
	} else {
		selectionState.skillIds = new Set([...selectionState.skillIds].filter((id) => skillOptionIds.has(id)))
	}

	renderSelectionList(selectionContainers.experience, selectionState.options.experience, selectionState.experienceIds, (id, checked) => {
		selectionState.hasUserInteracted.experience = true
		if (checked) selectionState.experienceIds.add(id)
		else selectionState.experienceIds.delete(id)
		renderPreview()
	})

	renderSelectionList(selectionContainers.skills, selectionState.options.skills, selectionState.skillIds, (id, checked) => {
		selectionState.hasUserInteracted.skills = true
		if (checked) selectionState.skillIds.add(id)
		else selectionState.skillIds.delete(id)
		renderPreview()
	})
}

function sectionHtml(title, innerHtml) {
	const sanitized = sanitizeHtml(innerHtml)
	const content = sanitized.trim()
	if (!content || content === "<p><br></p>") return ""
	return `<h2>${escapeHtml(title)}</h2>${content}`
}

async function saveResume() {
  console.log("Saving resume...")

	const selectedExperienceLabels = selectionState.options.experience
		.filter((o) => selectionState.experienceIds.has(o.id))
		.map((o) => o.label)
	const selectedSkillLabels = selectionState.options.skills
		.filter((o) => selectionState.skillIds.has(o.id))
		.map((o) => o.label)

  const resumeData = {
		username: sessionStorage.getItem("username") || "unknown_user",
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
    const response = await fetch(`http://localhost:8000/api/save/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
				"Authorization": `Bearer ${sessionStorage.getItem("jwtToken") || ""}`,
      },
      body: JSON.stringify({ content: resumeData })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log("Resume saved successfully:", result)
  } catch (error) {
		showErrorDialog(
			"Failed to save resume",
			"Please try again.",
			error
		)
  }
}

function renderPreview() {
	const previewEl = document.getElementById("divResumePreview")
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

	const summaryHtml = isQuillEmpty(quills.summary)
		? ""
		: sectionHtml("Summary", quills.summary.root.innerHTML)

	const coverLetterHtml = isQuillEmpty(quills.coverLetter)
		? ""
		: sectionHtml("Cover Letter", quills.coverLetter.root.innerHTML)

	let experienceHtml = ""
	if (!isQuillEmpty(quills.experience)) {
		const selectedBlocks = selectionState.options.experience.filter((o) => selectionState.experienceIds.has(o.id))
		if (selectionState.options.experience.length && selectedBlocks.length === 0) {
			experienceHtml = ""
		} else if (selectedBlocks.length && selectedBlocks.length !== selectionState.options.experience.length) {
			experienceHtml = sectionHtml(
				"Experience",
				selectedBlocks.map((b) => b.html).join("")
			)
		} else {
			experienceHtml = sectionHtml("Experience", quills.experience.root.innerHTML)
		}
	}
	const educationHtml = isQuillEmpty(quills.education)
		? ""
		: sectionHtml("Education", quills.education.root.innerHTML)
	const projectsHtml = isQuillEmpty(quills.projects)
		? ""
		: sectionHtml("Projects", quills.projects.root.innerHTML)

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

async function renderPage() {
	if (typeof Quill === "undefined") {
		// Quill didn't load nothing to initialize.
		return
	}

	txtApiKey.value = sessionStorage.getItem("geminiApiKey") || ""

	await get_resume()
	syncSelectionsFromContent({ initialLoad: true })


	for (const input of Object.values(inputs)) {
		input?.addEventListener("input", renderPreview)
	}
	for (const [key, quill] of Object.entries(quills)) {
		quill.on("text-change", () => {
			if (key === "experience" || key === "skills") {
				syncSelectionsFromContent()
			}
			renderPreview()
		})
	}

	renderPreview()
}
