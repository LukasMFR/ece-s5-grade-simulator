"use strict";

const FOUNDATION_COURSES = [
  { id: "maths", title: "Mathématiques 5", short: "Maths", weight: 3, groups: [
    { title: "Moyenne des examens", weight: 1, notes: [{ id: "math_ds1", label: "DS1", weight: 1 }, { id: "math_ds2", label: "DS2", weight: 1 }] }
  ] },
  { id: "electro", title: "Électrostatique & Magnétostatique", short: "Électro", weight: 3, groups: [
    { title: "Moyenne des examens", weight: 1, notes: [{ id: "elec_ds1", label: "DS1", weight: 1 }, { id: "elec_ds2", label: "DS2", weight: 1 }] }
  ] },
  { id: "python", title: "Programmation en Python", short: "Python", weight: 6, groups: [
    { title: "Moyenne des contrôles continus", weight: 1, notes: [{ id: "py_ns1", label: "NS1", weight: 1 }] },
    { title: "Projet", weight: 2, notes: [{ id: "py_proj", label: "Note de projet", weight: 1 }] }
  ] },
  { id: "bdd", title: "Bases de données", short: "BDD", weight: 4, groups: [
    { title: "Moyenne des contrôles continus", weight: 1, notes: [
      { id: "bdd_ns1", label: "NS1", weight: 1 },
      { id: "bdd_ns2", label: "NS2", weight: 1 },
      { id: "bdd_participation", label: "Participation", weight: 1 }
    ] },
    { title: "Moyenne des examens", weight: 2, notes: [{ id: "bdd_ds1", label: "DS1", weight: 1 }] }
  ] }
];
const UNITS = [
  {
    id: "fondamentaux", title: "Fondamentaux sciences & techniques", short: "Fondamentaux", credits: 16,
    hasBonus: true, courses: FOUNDATION_COURSES
  },
  {
    id: "adaptabilite", title: "Adaptabilité aux exigences de l’entreprise et de la société", short: "Adaptabilité", credits: 2,
    courses: [
      { id: "work", title: "Travailler en entreprise", weight: 1, groups: [
        { weight: 1, notes: [
          { id: "work_ns1", label: "Écrit", weight: 1 },
          { id: "work_ns2", label: "Oral", weight: 2 }
        ] }
      ] },
      { id: "management", title: "Bases de gestion", weight: 1, groups: [
        { weight: 1, notes: [{ id: "management_ds1", label: "DS1", weight: 1 }] }
      ] }
    ]
  },
  {
    id: "developpement", title: "Développement personnel et interculturel", short: "Développement", credits: 2,
    courses: [
      { id: "english", title: "Anglais 5", weight: 1, groups: [
        { id: "english_ns1", weight: 3, notes: [
          { id: "english_news", label: "Présentations d’actualité", weight: 20 },
          { id: "english_article", label: "Article Hard News", weight: 20 },
          { id: "english_participation", label: "Débats improvisés et participation", weight: 20 },
          { id: "english_debate_individual", label: "Débat final · individuel", weight: 20 },
          { id: "english_debate_team", label: "Débat final · équipe", weight: 20 }
        ] },
        { weight: 1, notes: [{ id: "english_ds1", label: "DS1", weight: 1 }] }
      ] }
    ]
  },
  {
    id: "experience", title: "Expérience entreprise", short: "Expérience entreprise", credits: 10,
    courses: [
      { id: "company", title: "Acquis Entreprise 5", weight: 9, groups: [
        { weight: 1, notes: [
          { id: "company_review", label: "Éval. entreprise", weight: 2 },
          { id: "company_mentor", label: "Rapport maître", weight: 1 },
          { id: "company_tutor", label: "Rapport tuteur", weight: 1 },
          { id: "company_defense", label: "Soutenance", weight: 2 }
        ] }
      ] }
    ],
    feedback: { id: "feedback", title: "Expérience Entreprise 5", weight: 1 }
  }
];
const COURSES = UNITS.flatMap(unit => unit.courses);
const TOTAL_ASSESSMENTS = COURSES.flatMap(course => course.groups)
  .reduce((sum, group) => sum + group.notes.length, UNITS.filter(unit => unit.feedback).length);
const FEEDBACK_VALUES = ["validated", "not-validated"];

// Formats acceptés : 0 à 20, point ou virgule, sans limite artificielle à 2 décimales.
function parseGrade(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const normalized = String(raw).trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return NaN;
  const result = Number(normalized);
  return Number.isFinite(result) && result >= 0 && result <= 20 ? result : NaN;
}
function weightedAverage(items) {
  let numerator = 0, denominator = 0;
  for (const item of items) {
    if (item.value !== null && Number.isFinite(item.value)) {
      numerator += item.value * item.weight;
      denominator += item.weight;
    }
  }
  return denominator > 0 ? numerator / denominator : null;
}
function calculateCourse(course, values) {
  let entered = 0;
  const groups = course.groups.map(group => {
    const notes = group.notes.map(note => {
      const value = parseGrade(values[note.id]);
      if (Number.isFinite(value)) entered++;
      return { value, weight: note.weight };
    });
    return { id: group.id, value: weightedAverage(notes), weight: group.weight };
  });
  const total = course.groups.reduce((sum, group) => sum + group.notes.length, 0);
  return { id: course.id, weight: course.weight, average: weightedAverage(groups), groups, entered, total, complete: entered === total };
}

function calculate(values) {
  const parsedBonus = parseGrade(values.bonus);
  const bonusValid = parsedBonus === null || (Number.isFinite(parsedBonus) && parsedBonus <= 1);
  const bonus = parsedBonus ?? 0;
  const units = UNITS.map(unit => {
    const courses = unit.courses.map(course => calculateCourse(course, values));
    const feedback = unit.feedback ? values[unit.feedback.id] : null;
    const feedbackEntered = FEEDBACK_VALUES.includes(feedback);
    const entered = courses.reduce((sum, course) => sum + course.entered, Number(feedbackEntered));
    const complete = courses.every(course => course.complete) && (!unit.feedback || feedbackEntered);
    const baseAverage = weightedAverage(courses.map(course => ({ value: course.average, weight: course.weight })));
    const average = unit.hasBonus
      ? (baseAverage === null || !bonusValid ? null : baseAverage + bonus)
      : baseAverage;

    return {
      ...unit, courses, feedback, entered, complete, baseAverage, average,
      compensation: complete && average !== null && average >= 10
    };
  });
  const entered = units.reduce((sum, unit) => sum + unit.entered, 0);
  const average = bonusValid
    ? weightedAverage(units.map(unit => ({ value: unit.average, weight: unit.credits })))
    : null;
  return { units, average, entered, complete: entered === TOTAL_ASSESSMENTS, bonus, bonusValid };
}

const STORE_KEY = "ece-s5-notes-v1";
const noteLabel = note => note.id === "py_proj" ? "Projet" : note.label;
const format2 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false
});
const fmt = value => value === null ? "—" : format2.format(value);
const byId = id => document.getElementById(id);

const data = Object.create(null);
const noteFields = [];
const courseViews = new Map();
const unitViews = new Map();
const feedbackFields = [];
const resetButton = byId("reset-button");
const resetDialog = byId("reset-dialog");

function storageFail() {
  byId("storage-note").textContent = "Stockage local indisponible. Les notes restent sur cette page.";
}

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return;
    for (const course of COURSES) {
      for (const group of course.groups) {
        for (const note of group.notes) {
          if (typeof stored[note.id] === "string") data[note.id] = stored[note.id];
        }
      }
    }
    for (const { feedback } of UNITS) {
      if (feedback && FEEDBACK_VALUES.includes(stored[feedback.id])) data[feedback.id] = stored[feedback.id];
    }
    if (typeof stored.bonus === "string") data.bonus = stored.bonus;
  } catch {
    storageFail();
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    storageFail();
  }
}

function replaceNotes(notes) {
  for (const key of Object.keys(data)) delete data[key];
  Object.assign(data, notes);
  for (const { id, input } of noteFields) {
    const grade = parseGrade(data[id]);
    input.value = Number.isFinite(grade) ? fmt(grade) : (data[id] || "");
  }
  for (const select of feedbackFields) select.value = data[select.id.slice("input-".length)] || "";
  bonusInput.value = data.bonus || "";
  save();
  update();
}

function parseBackup(text) {
  const backup = JSON.parse(text);
  const notes = backup?.notes;
  if (backup?.version !== 1 || !notes || typeof notes !== "object" || Array.isArray(notes)) {
    throw new Error("Format de sauvegarde invalide");
  }
  const gradeIds = new Set(["bonus", ...noteFields.map(({ id }) => id)]);
  const feedbackIds = new Set(feedbackFields.map(select => select.id.slice("input-".length)));
  for (const [id, value] of Object.entries(notes)) {
    if (gradeIds.has(id) && typeof value === "string") continue;
    if (feedbackIds.has(id) && (value === "" || FEEDBACK_VALUES.includes(value))) continue;
    throw new Error("Champ de sauvegarde invalide");
  }
  return notes;
}

function validateField(input, error, invalid, description = "") {
  input.classList.toggle("invalid", invalid);
  input.setAttribute("aria-invalid", String(invalid));
  error.hidden = !invalid;
  const describedBy = [description, invalid ? error.id : ""].filter(Boolean).join(" ");
  if (describedBy) input.setAttribute("aria-describedby", describedBy);
  else input.removeAttribute("aria-describedby");
}

function createCourseRow(course) {
  const row = byId("course-template").content.firstElementChild.cloneNode(true);
  const title = row.querySelector("h4");
  title.id = "course-" + course.id;
  title.textContent = course.title;
  row.setAttribute("aria-labelledby", title.id);
  row.querySelector(".course-icon").src = "assets/marks/" + course.id + ".webp";
  row.querySelector(".course-coefficient").textContent = "Coefficient " + course.weight;

  return row;
}

function renderCourse(course) {
  const row = createCourseRow(course);
  const fields = row.querySelector(".course-fields");
  const notes = course.groups.flatMap(group => group.notes.map(note => ({ note, group })));
  // Keep the familiar DS, NS and Projet entry order from the previous interface.
  if (FOUNDATION_COURSES.includes(course)) notes.sort((a, b) => noteLabel(a.note).localeCompare(noteLabel(b.note), "fr"));
  let nsSummary;
  for (const { note, group } of notes) {
    if (group.id && !nsSummary) {
      nsSummary = byId("ns-summary-template").content.firstElementChild.cloneNode(true);
      fields.append(nsSummary);
    }
    const field = byId("note-template").content.firstElementChild.cloneNode(true);
    const label = field.querySelector("label");
    const input = field.querySelector("input");
    const error = field.querySelector(".cell-error");
    const name = noteLabel(note);

    input.id = "input-" + note.id;
    error.id = "error-" + note.id;
    label.htmlFor = input.id;
    label.textContent = name;
    input.setAttribute("aria-label", course.title + " — " + name + " sur 20");
    const multiplier = group.id ? note.weight : group.weight > 1 ? group.weight : note.weight;
    if (multiplier > 1) {
      const badge = document.createElement("span");
      badge.className = "block-badge";
      badge.textContent = group.id ? multiplier + " %" : "×" + multiplier;
      badge.setAttribute("aria-hidden", "true");
      label.append(badge);
      const weighting = group.id ? multiplier + " % du NS1" : "coefficient " + multiplier;
      input.setAttribute("aria-label", input.getAttribute("aria-label") + ", " + weighting);
    }

    const initial = parseGrade(data[note.id]);
    input.value = Number.isFinite(initial) ? fmt(initial) : (data[note.id] || "");
    input.addEventListener("input", () => {
      data[note.id] = input.value;
      save();
      update();
    });
    input.addEventListener("focus", () => {
      if (Number.isFinite(parseGrade(data[note.id]))) input.value = data[note.id].replace(".", ",");
      input.select();
    });
    input.addEventListener("blur", () => {
      const value = parseGrade(data[note.id]);
      if (Number.isFinite(value)) input.value = fmt(value);
    });
    const fieldIndex = noteFields.length;
    input.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      const next = noteFields[fieldIndex + 1];
      if (next) next.input.focus();
      else input.blur();
    });

    noteFields.push({ id: note.id, input, error });
    fields.append(field);
  }

  courseViews.set(course.id, {
    nsSummary,
    result: row.querySelector(".course-result"),
    average: row.querySelector(".average-value"),
    status: row.querySelector(".status-cell")
  });
  return row;
}

function renderFeedback(feedback) {
  const row = createCourseRow(feedback);
  const field = byId("feedback-template").content.firstElementChild.cloneNode(true);
  const select = field.querySelector("select");
  select.id = "input-" + feedback.id;
  field.querySelector("label").htmlFor = select.id;
  select.value = data[feedback.id] || "";
  select.addEventListener("change", () => {
    data[feedback.id] = select.value;
    save();
    update();
  });

  row.classList.add("feedback-course");
  row.querySelector(".course-fields").append(field);
  row.querySelector(".course-result").remove();
  feedbackFields.push(select);
  return row;
}

function renderUnits() {
  for (const unit of UNITS) {
    const section = byId("unit-template").content.firstElementChild.cloneNode(true);
    const title = section.querySelector("h3");
    const notes = section.querySelector(".unit-courses");
    section.id = "ue-" + unit.id;
    title.id = section.id + "-title";
    title.textContent = unit.title;
    section.setAttribute("aria-labelledby", title.id);
    section.querySelector(".unit-credits").textContent = unit.credits + " ECTS";

    for (const course of unit.courses) notes.append(renderCourse(course));
    if (unit.feedback) notes.append(renderFeedback(unit.feedback));
    if (unit.hasBonus) section.append(byId("bonus-template").content.cloneNode(true));

    const link = byId("unit-link-template").content.firstElementChild.cloneNode(true);
    link.href = "#" + section.id;
    link.querySelector(".unit-link-title").textContent = unit.short;
    link.querySelector(".unit-link-credits").textContent = unit.credits + " ECTS";
    byId("unit-links").append(link);
    byId("notes-body").append(section);
    unitViews.set(unit.id, {
      averages: [link.querySelector(".unit-average"), section.querySelector(".unit-average")],
      status: section.querySelector(".unit-status")
    });
  }
}

function updateCourse(course, compensation) {
  const view = courseViews.get(course.id);
  if (view.nsSummary) {
    const ns = course.groups.find(group => group.id);
    view.nsSummary.querySelector("output").textContent = fmt(ns.value);
  }
  const average = course.average;
  const passed = average !== null && average >= 10;
  const compensated = compensation && average >= 7 && average < 10;

  view.average.textContent = fmt(average);
  view.result.classList.toggle("pass", passed);
  view.result.classList.toggle("compensated", compensated);
  view.status.classList.toggle("pass", passed && course.complete);
  view.status.classList.toggle("compensated", compensated);

  if (average === null) view.status.textContent = "À renseigner";
  else if (!course.complete) view.status.textContent = "Provisoire " + course.entered + "/" + course.total;
  else if (passed) view.status.textContent = "≥ 10";
  else if (compensated) view.status.textContent = "Compensée";
  else view.status.textContent = average < 7 ? "Sous 7" : "Sous 10";
}

function unitStatus(unit, bonusValid) {
  if (unit.hasBonus && !bonusValid) return "Bonus invalide";
  if (unit.feedback === "not-validated") return "Retour d’expérience non validé";
  if (unit.entered === 0) return "À renseigner";
  if (!unit.complete) return "Provisoire";
  if (unit.average < 10) return "Moyenne sous 10";
  if (unit.courses.some(course => course.average < 7)) return "Une matière sous 7";
  return "Seuil atteint";
}

function update() {
  for (const { id, input, error } of noteFields) {
    validateField(input, error, Number.isNaN(parseGrade(data[id])));
  }

  const result = calculate(data);
  validateField(bonusInput, bonusError, !result.bonusValid, "bonus-range");
  resetButton.disabled = !Object.values(data).some(value => value !== "");

  for (const unit of result.units) {
    for (const course of unit.courses) updateCourse(course, unit.compensation);
    const view = unitViews.get(unit.id);
    for (const output of view.averages) output.textContent = fmt(unit.average);
    view.status.textContent = unitStatus(unit, result.bonusValid);
  }

  byId("semester-average").textContent = fmt(result.average);
  byId("semester-status").textContent = !result.bonusValid ? "Corrigez le bonus de l’UE Fondamentaux."
    : result.average === null ? "Les champs vides sont exclus du calcul."
    : result.complete ? "Moyenne pondérée par les ECTS." : "Moyenne provisoire, pondérée par les ECTS.";
  byId("progress-label").textContent = result.entered + " / " + TOTAL_ASSESSMENTS;
  byId("progress-fill").style.width = result.entered / TOTAL_ASSESSMENTS * 100 + "%";
  byId("progress-bar").setAttribute("aria-valuenow", String(result.entered));
}

load();
renderUnits();
const bonusInput = byId("bonus-input");
const bonusError = byId("bonus-error");
byId("progress-bar").setAttribute("aria-valuemax", String(TOTAL_ASSESSMENTS));
bonusInput.value = data.bonus || "";
bonusInput.addEventListener("input", () => {
  data.bonus = bonusInput.value;
  save();
  update();
});

document.querySelector(".masthead-link").addEventListener("click", () => {
  byId("calculs").open = true;
});

byId("export-button").addEventListener("click", () => {
  const exportedAt = new Date().toISOString();
  const json = JSON.stringify({ version: 1, exportedAt, notes: data }, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ece-s5-" + exportedAt.replaceAll(":", "-") + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const importButton = byId("import-button");
const importFile = byId("import-file");
const backupStatus = byId("backup-status");
importButton.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;
  importButton.disabled = true;
  backupStatus.textContent = "";
  try {
    const notes = parseBackup(await file.text());
    replaceNotes(notes);
    backupStatus.textContent = "Import terminé. La saisie a été remplacée.";
  } catch {
    backupStatus.textContent = "Import impossible. Choisissez un fichier JSON exporté par le simulateur.";
  } finally {
    importFile.value = "";
    importButton.disabled = false;
  }
});

resetButton.addEventListener("click", () => {
  resetDialog.returnValue = "";
  resetDialog.showModal();
});
resetDialog.addEventListener("close", () => {
  if (resetDialog.returnValue !== "reset") return;
  replaceNotes({});
  backupStatus.textContent = "";
  noteFields[0].input.focus();
});

update();
