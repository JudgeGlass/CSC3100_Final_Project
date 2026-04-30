// **** [ Written ENTIRELY by AI] ****
// This file handles the selection of experiences and skills to be added to the resume.
// This creates a selectionManager that handles assigning IDs to each skill/experience and creating
// checkboxs at the bottom of the page to select.
// Written by Copilot

;(function (global) {
	// Selection manager for handling explicit user-added Experience (jobs)
	// and Skills entries. Users add entries via the editor (+ buttons) and
	// then pick which entries appear in the preview using checkboxes.
	// This file exposes a factory `createSelectionManager` on
	// `global.ResumeApp.selection` that the app uses to manage selection state.

	global.ResumeApp = global.ResumeApp || {}
	global.ResumeApp.selection = global.ResumeApp.selection || {}

	// Utilities used for parsing and stable id generation.
	const { htmlToTemplate, normalizeText, optionId, isQuillEmpty } = global.ResumeApp.utils

		/**
		 * Render a list of checkbox items into `container`.
		 * - `options` is an array of {id,label,html}
		 * - `selectedIds` is a Set of checked ids
		 * - `onChange(id, checked)` is invoked when a checkbox toggles
		 * - `emptyMessage` is shown when there are no options
		 * - `onDelete(id)` optional callback for deleting an item (button shown only for checked items)
		 */
		function renderSelectionList(container, options, selectedIds, onChange, emptyMessage, onDelete) {
			if (!container) return
			if (!options.length) {
				container.innerHTML = `<div class="text-muted small">${emptyMessage}</div>`
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

				// Show a small Delete button for checked items when a delete handler is provided.
				if (typeof onDelete === "function" && selectedIds.has(opt.id)) {
					const deleteBtn = document.createElement("button")
					deleteBtn.type = "button"
					deleteBtn.className = "btn btn-sm btn-outline-danger ms-2"
					deleteBtn.textContent = "Delete"
					deleteBtn.addEventListener("click", () => onDelete(opt.id))
					row.appendChild(deleteBtn)
				}

				container.appendChild(row)
			}
		}

	// Gets either the heading or normal text of the experience entry and creates the label for the checkbox
	// at the bottom of the page. If it can't find either, it just puts "Job <INDEX>"
	function buildExperienceLabel(html, index) {
		const template = htmlToTemplate(html)
		const heading = template.content.querySelector("h1, h2, h3, h4, h5")
		const headingText = normalizeText(heading?.textContent || "")
		if (headingText) return headingText

		const text = normalizeText(template.content.textContent || "")
		if (text) return text.split(" ").slice(0, 10).join(" ")

		return `Job ${index}`
	}

	// Gets either the text of the skill entry and creates the label for the checkbox
	// at the bottom of the page. If it can't find text, it just puts "Skill <INDEX>"
	function buildSkillLabel(html, index) {
		const text = normalizeText(htmlToTemplate(html).content.textContent || "")
		if (text) return text.split(" ").slice(0, 8).join(" ")
		return `Skill ${index}`
	}

	// Takes in the experience items, skill items, and instantiates the state.
	// Handles everything related to the selection of the job/skills
	function createSelectionManager({ quills, containers, renderPreview }) {

		// Holds all the items
		const loadedSelections = {
			experienceItems: null,
			skillItems: null,
			selectedExperienceIds: null,
			selectedSkillIds: null,
		}

		// Holds the set of ids for the experience(s) and skill(s)
		// Options holds the selected ids
		const selectionState = {
			experienceIds: new Set(),
			skillIds: new Set(),
			options: {
				experience: [],
				skills: [],
			},
		}

		// Sets the selections and their ids, sets to null if passed in values are not an array
		function setLoadedSelections({ experienceItems, skillItems, selectedExperienceIds, selectedSkillIds }) {
			loadedSelections.experienceItems = Array.isArray(experienceItems) ? experienceItems : null
			loadedSelections.skillItems = Array.isArray(skillItems) ? skillItems : null
			loadedSelections.selectedExperienceIds = Array.isArray(selectedExperienceIds) ? selectedExperienceIds : null
			loadedSelections.selectedSkillIds = Array.isArray(selectedSkillIds) ? selectedSkillIds : null
		}

		// Reset all the ids and items to empty state
		function resetSelections() {
			selectionState.experienceIds = new Set()
			selectionState.skillIds = new Set()
			selectionState.options.experience = []
			selectionState.options.skills = []
		}

		function hydrateFromLoadedSelections() {
			if (selectionState.options.experience.length === 0 && Array.isArray(loadedSelections.experienceItems)) {
				selectionState.options.experience = loadedSelections.experienceItems
					.map((item, index) => {
						const html = String(item?.html || "")
						if (!normalizeText(htmlToTemplate(html).content.textContent || "")) return null
						const label = normalizeText(item?.label || "") || buildExperienceLabel(html, index + 1)
						const id = String(item?.id || optionId("job", label, `${index}|${html}`))
						return { id, label, html }
					})
					.filter(Boolean)
			}

			if (selectionState.options.skills.length === 0 && Array.isArray(loadedSelections.skillItems)) {
				selectionState.options.skills = loadedSelections.skillItems
					.map((item, index) => {
						const html = String(item?.html || "")
						const label = normalizeText(item?.label || "") || buildSkillLabel(html, index + 1)
						if (!label) return null
						const id = String(item?.id || optionId("skill", label, `${index}|${html}`))
						return { id, label, html }
					})
					.filter(Boolean)
			}

			if (selectionState.experienceIds.size === 0) {
				if (Array.isArray(loadedSelections.selectedExperienceIds) && loadedSelections.selectedExperienceIds.length) {
					const allowed = new Set(selectionState.options.experience.map((item) => item.id))
					selectionState.experienceIds = new Set(loadedSelections.selectedExperienceIds.filter((id) => allowed.has(id)))
				} else {
					selectionState.experienceIds = new Set(selectionState.options.experience.map((item) => item.id))
				}
			}

			if (selectionState.skillIds.size === 0) {
				if (Array.isArray(loadedSelections.selectedSkillIds) && loadedSelections.selectedSkillIds.length) {
					const allowed = new Set(selectionState.options.skills.map((item) => item.id))
					selectionState.skillIds = new Set(loadedSelections.selectedSkillIds.filter((id) => allowed.has(id)))
				} else {
					selectionState.skillIds = new Set(selectionState.options.skills.map((item) => item.id))
				}
			}
		}

		function renderSelections() {
			renderSelectionList(
				containers.experience,
				selectionState.options.experience,
				selectionState.experienceIds,
				(id, checked) => {
					if (checked) selectionState.experienceIds.add(id)
					else selectionState.experienceIds.delete(id)
					renderPreview()
				},
				"No jobs added yet. Use the + button in Experience.",
				(id) => {
					selectionState.options.experience = selectionState.options.experience.filter((item) => item.id !== id)
					selectionState.experienceIds.delete(id)
					renderSelections()
					renderPreview()
				}
			)

			renderSelectionList(
				containers.skills,
				selectionState.options.skills,
				selectionState.skillIds,
				(id, checked) => {
					if (checked) selectionState.skillIds.add(id)
					else selectionState.skillIds.delete(id)
					renderPreview()
				},
				"No skills added yet. Use the + button in Skills."
			)
		}

		function addExperienceFromEditor() {
			if (isQuillEmpty(quills.experience)) return false
			const html = quills.experience.root.innerHTML
			const label = buildExperienceLabel(html, selectionState.options.experience.length + 1)
			const id = optionId("job", label, `${Date.now()}|${html}`)

			selectionState.options.experience.push({ id, label, html })
			selectionState.experienceIds.add(id)
			quills.experience.setContents([{ insert: "\n" }], "silent")
			renderSelections()
			renderPreview()
			return true
		}

		function addSkillFromEditor() {
			if (isQuillEmpty(quills.skills)) return false
			const html = quills.skills.root.innerHTML
			const label = buildSkillLabel(html, selectionState.options.skills.length + 1)
			if (!label) return false
			const id = optionId("skill", label, `${Date.now()}|${html}`)

			selectionState.options.skills.push({ id, label, html })
			selectionState.skillIds.add(id)
			quills.skills.setContents([{ insert: "\n" }], "silent")
			renderSelections()
			renderPreview()
			return true
		}

		function syncSelectionsFromContent({ initialLoad = false } = {}) {
			if (initialLoad) {
				hydrateFromLoadedSelections()
			}

			const experienceOptionIds = new Set(selectionState.options.experience.map((item) => item.id))
			selectionState.experienceIds = new Set(
				[...selectionState.experienceIds].filter((id) => experienceOptionIds.has(id))
			)

			const skillOptionIds = new Set(selectionState.options.skills.map((item) => item.id))
			selectionState.skillIds = new Set([...selectionState.skillIds].filter((id) => skillOptionIds.has(id)))

			renderSelections()
		}

		return {
			loadedSelections,
			selectionState,
			setLoadedSelections,
			resetSelections,
			addExperienceFromEditor,
			addSkillFromEditor,
			syncSelectionsFromContent,
		}
	}

	global.ResumeApp.selection.createSelectionManager = createSelectionManager
})(window)
