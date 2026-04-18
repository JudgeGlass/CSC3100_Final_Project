function escapeHtml(text) {
	return String(text)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function sanitizeHtml(html) {
	const template = document.createElement("template");
	template.innerHTML = String(html ?? "");

	const blockedTags = new Set(["script", "iframe", "object", "embed"]);
	const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);

	const nodesToRemove = [];
	while (walker.nextNode()) {
		const el = walker.currentNode;
		if (blockedTags.has(el.tagName.toLowerCase())) {
			nodesToRemove.push(el);
			continue;
		}

		for (const attr of Array.from(el.attributes)) {
			const name = attr.name.toLowerCase();
			const value = attr.value;
			if (name.startsWith("on")) {
				el.removeAttribute(attr.name);
				continue;
			}
			if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
				el.removeAttribute(attr.name);
			}
		}
	}
	for (const el of nodesToRemove) el.remove();

	return template.innerHTML;
}

function normalizeUrl(url) {
	const raw = String(url ?? "").trim();
	if (!raw) return "";
	if (/^https?:\/\//i.test(raw)) return raw;
	return `https://${raw}`;
}

function isQuillEmpty(quill) {
	return quill.getText().trim().length === 0;
}

function sectionHtml(title, innerHtml) {
	const sanitized = sanitizeHtml(innerHtml);
	const content = sanitized.trim();
	if (!content || content === "<p><br></p>") return "";
	return `<h2>${escapeHtml(title)}</h2>${content}`;
}

document.addEventListener("DOMContentLoaded", () => {
	if (typeof Quill === "undefined") {
		// Quill didn't load; nothing to initialize.
		return;
	}

	const inputs = {
		fullName: document.getElementById("fullName"),
		headline: document.getElementById("headline"),
		email: document.getElementById("email"),
		phone: document.getElementById("phone"),
		location: document.getElementById("location"),
		website: document.getElementById("website"),
	};
	const previewEl = document.getElementById("divResumePreview");

	const toolbarOptions = [
		[{ header: [1, 2, false] }],
		["bold", "italic", "underline"],
		[{ list: "ordered" }, { list: "bullet" }],
		["link"],
		["clean"],
	];

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
	};

	function renderPreview() {
		const fullName = (inputs.fullName?.value ?? "").trim();
		const headline = (inputs.headline?.value ?? "").trim();
		const email = (inputs.email?.value ?? "").trim();
		const phone = (inputs.phone?.value ?? "").trim();
		const location = (inputs.location?.value ?? "").trim();
		const website = (inputs.website?.value ?? "").trim();

		const contactBits = [];
		if (email) {
			contactBits.push(
				`<a href="mailto:${encodeURIComponent(email)}" class="text-decoration-none">${escapeHtml(email)}</a>`
			);
		}
		if (phone) contactBits.push(escapeHtml(phone));
		if (location) contactBits.push(escapeHtml(location));
		if (website) {
			const url = normalizeUrl(website);
			contactBits.push(
				`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" class="text-decoration-none">${escapeHtml(
					website
				)}</a>`
			);
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
		`;

		const summaryHtml = isQuillEmpty(quills.summary)
			? ""
			: sectionHtml("Summary", quills.summary.root.innerHTML);
		const experienceHtml = isQuillEmpty(quills.experience)
			? ""
			: sectionHtml("Experience", quills.experience.root.innerHTML);
		const educationHtml = isQuillEmpty(quills.education)
			? ""
			: sectionHtml("Education", quills.education.root.innerHTML);
		const projectsHtml = isQuillEmpty(quills.projects)
			? ""
			: sectionHtml("Projects", quills.projects.root.innerHTML);
		const skillsHtml = isQuillEmpty(quills.skills)
			? ""
			: sectionHtml("Skills", quills.skills.root.innerHTML);

		previewEl.innerHTML = `${headerHtml}${summaryHtml}${experienceHtml}${educationHtml}${projectsHtml}${skillsHtml}`;
	}

	for (const input of Object.values(inputs)) {
		input?.addEventListener("input", renderPreview);
	}
	for (const quill of Object.values(quills)) {
		quill.on("text-change", renderPreview);
	}

	renderPreview();
});
