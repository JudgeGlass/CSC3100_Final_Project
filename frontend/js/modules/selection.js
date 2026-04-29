;(function (global) {
	global.ResumeApp = global.ResumeApp || {}
	global.ResumeApp.selection = global.ResumeApp.selection || {}

	const { htmlToTemplate, normalizeText, optionId, isQuillEmpty } = global.ResumeApp.utils

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
			const label =
				normalizeText(currentLabel) ||
				normalizeText(textKey.split(" ").slice(0, 10).join(" ")) ||
				"Experience"
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

	function createSelectionManager({ quills, containers, renderPreview }) {
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

		function setLoadedSelections({ experienceLabels, skillLabels }) {
			loadedSelections.experienceLabels = experienceLabels ?? null
			loadedSelections.skillLabels = skillLabels ?? null
		}

		function resetSelections() {
			selectionState.experienceIds = new Set()
			selectionState.skillIds = new Set()
			selectionState.hasUserInteracted.experience = false
			selectionState.hasUserInteracted.skills = false
			selectionState.options.experience = []
			selectionState.options.skills = []
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
				selectionState.experienceIds = new Set(
					[...selectionState.experienceIds].filter((id) => experienceOptionIds.has(id))
				)
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

			renderSelectionList(containers.experience, selectionState.options.experience, selectionState.experienceIds, (id, checked) => {
				selectionState.hasUserInteracted.experience = true
				if (checked) selectionState.experienceIds.add(id)
				else selectionState.experienceIds.delete(id)
				renderPreview()
			})

			renderSelectionList(containers.skills, selectionState.options.skills, selectionState.skillIds, (id, checked) => {
				selectionState.hasUserInteracted.skills = true
				if (checked) selectionState.skillIds.add(id)
				else selectionState.skillIds.delete(id)
				renderPreview()
			})
		}

		function shouldSync() {
			return !isQuillEmpty(quills.experience) || !isQuillEmpty(quills.skills)
		}

		return {
			loadedSelections,
			selectionState,
			setLoadedSelections,
			resetSelections,
			syncSelectionsFromContent,
			shouldSync,
		}
	}

	global.ResumeApp.selection.createSelectionManager = createSelectionManager
})(window)
