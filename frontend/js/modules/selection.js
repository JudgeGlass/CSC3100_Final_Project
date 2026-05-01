// **** [ Written ENTIRELY by AI] ****
// I've put comments explaining (hopefully) what everything does (This is a little overcomplicated, but works)
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
	// This is a factory-like data structure
	function createSelectionManager({ quills, containers, renderPreview }) {

		// Holds all the items recieved the by backend DB
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

		// Whenever we get the resume data on initial page load, we save the experiences/skills to loadedSelections.*, then remap it to the selectionState.*
		// By remap, it recreates all the unique IDs and selected Sets the user saved to the DB
		function hydrateFromLoadedSelections() {

			// If the experienceItems we received from the DB is a valid array and our selectionState is empty, then add each experienceItem to the selectionState.option.experience (this recreates the ID)
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

			// Same as the if statement above this one, but for the skills data
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

			// Map the saved selected experiences to selectionState.experienceIds to preserve it
			if (selectionState.experienceIds.size === 0) {
				if (Array.isArray(loadedSelections.selectedExperienceIds) && loadedSelections.selectedExperienceIds.length) {
					const allowed = new Set(selectionState.options.experience.map((item) => item.id))
					selectionState.experienceIds = new Set(loadedSelections.selectedExperienceIds.filter((id) => allowed.has(id)))
				} else {
					selectionState.experienceIds = new Set(selectionState.options.experience.map((item) => item.id))
				}
			}

			// Same as previous if statement, but for the selected skills
			if (selectionState.skillIds.size === 0) {
				if (Array.isArray(loadedSelections.selectedSkillIds) && loadedSelections.selectedSkillIds.length) {
					const allowed = new Set(selectionState.options.skills.map((item) => item.id))
					selectionState.skillIds = new Set(loadedSelections.selectedSkillIds.filter((id) => allowed.has(id)))
				} else {
					selectionState.skillIds = new Set(selectionState.options.skills.map((item) => item.id))
				}
			}
		}

		// This renders the checkbox list of selectable skills and experiences.
		// Also handles the deletion of any of skill/experience and the logic on if it should be rendered in the preview or not
		function renderSelections() {
			renderSelectionList(
				containers.experience,
				selectionState.options.experience,
				selectionState.experienceIds,
				(id, checked) => { // This is the onChange functions whenever the checkbox get's selected
					if (checked) selectionState.experienceIds.add(id) // We aadd the ID of the experience entry to the experienceIds set if checked
					else selectionState.experienceIds.delete(id) // Otherwise, remove it from the Set
					renderPreview() // Then show the resume preview
				},
				"No jobs added yet. Use the + button in Experience.",
				(id) => { // onDelete(), handles the delete button next to the checkbox to delete the experience
					selectionState.options.experience = selectionState.options.experience.filter((item) => item.id !== id) // Filter out the ID we are deleting and set it as the new experience(s) array
					selectionState.experienceIds.delete(id) // Remove the experience from the ID set
					renderSelections() // Render this function again to make a new checkbox list
					renderPreview() // Then show the resume preview
				}
			)

			// This does the exact same thing as the part above, just handling the "skills" sections instead
			renderSelectionList(
				containers.skills,
				selectionState.options.skills,
				selectionState.skillIds,
				(id, checked) => {
					if (checked) selectionState.skillIds.add(id)
					else selectionState.skillIds.delete(id)
					renderPreview()
				},
				"No skills added yet. Use the + button in Skills.",
				(id) => { // onDelete(), handles the delete button next to the checkbox to delete the experience
					selectionState.options.skills = selectionState.options.skills.filter((item) => item.id !== id) // Filter out the ID we are deleting and set it as the new experience(s) array
					selectionState.skillIds.delete(id) // Remove the experience from the ID set
					renderSelections() // Render this function again to make a new checkbox list
					renderPreview() // Then show the resume preview
				}
			)
		}

		// This takes the HTML content of the experience Quill input and adds it to the selectionState.options.experience array
		function addExperienceFromEditor() {
			if (isQuillEmpty(quills.experience)) return false // Check if input is empty or not
			const html = quills.experience.root.innerHTML // Get Quill input content
			const label = buildExperienceLabel(html, selectionState.options.experience.length + 1) // Create the checkbox label, using the array length + 1 as the label if buildExperienceLabel can't figure out the label text
			const id = optionId("job", label, `${Date.now()}|${html}`) // Creates a unique ID for the experience

			selectionState.options.experience.push({ id, label, html }) // Put the id, label, and html content in the array
			selectionState.experienceIds.add(id) // Add the id to the selected ID set (New entries are selected by default)
			quills.experience.setContents([{ insert: "\n" }], "silent") // Clear the experience input Quill
			renderSelections() // Render the new select checkbox list
			renderPreview() // Render the preivew
			return true // Return true if a new entry was created successfully 
		}

		// This does the same thing as addExperienceFromEditor()^, but for skills instead
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

		// This function renders whatever experiences/skills the user had saved previously on their resume
		// This is only called on initial page load
		function syncSelectionsFromContent({ initialLoad = false } = {}) {
			if (initialLoad) { // Create the initial selection checkbox list at the bottom of page
				hydrateFromLoadedSelections()
			}

			// We have to "re-sync" the arrays since we set these after getting the resume and the user might have have what should be selected
			const experienceOptionIds = new Set(selectionState.options.experience.map((item) => item.id)) // Get Set of all experience entry IDs
			selectionState.experienceIds = new Set([...selectionState.experienceIds].filter((id) => experienceOptionIds.has(id))) // Refilter the experience(s) array

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
