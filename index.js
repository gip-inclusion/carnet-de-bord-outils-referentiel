const { type } = require("os");
const xlsxFile = require("read-excel-file/node");

xlsxFile("./referentiel.xlsx")
  .then(parseRow)
  .then(generateSql)
  .then(console.log);

function getTheme(theme) {
  const themes = {
    Logement: "logement",
    Emploi: "emploi",
    Formation: "formation",
    "Difficultés administratives": "difficulte_administrative",
    "Difficultés financières": "difficulte_financiere",
    Mobilité: "mobilite",
    Santé: "sante",
    "Contraintes familiales": "contraintes_familiales",
    "Maîtrise de la langue française": "maitrise_langue",
    logement: "logement",
    emploi: "emploi",
    formation: "formation",
    difficulte_administrative: "difficulte_administrative",
    difficulte_financiere: "difficulte_financiere",
    mobilite: "mobilite",
    sante: "sante",
    contraintes_familiales: "contraintes_familiales",
    maitrise_langue: "maitrise_langue",
  }
;
  return themes[theme];
}

function parseRow(rows) {
  return toObjects(rows[0], rows.slice(1));
}

function toObjects(rowHeaders, data) {
  return data.map((row) => {
    return {
      theme: getTheme(row[0]),
      type: row[1].toLowerCase(),
      oldValue: row[2],
      newValue: row[4],
      action: row[3],
    };
  });
}

function generateSql(data) {
  const updateJsonMigrations = getSqlJsonUpdates(
    data.filter(({ action }) => action === "modifier" || action === "fusionner")
  );
  const insertMigrations = getSqlInserts(
    data.filter(({ action }) => action === "ajouter")
  );
  const updateMigrations = getSqlUpdates(
    data.filter(({ action }) => action === "modifier")
  );
  const deleteMigrations = getDeleteUpdates(
    data.filter(({ action }) => action === "fusionner" || action === "supprimer")
  );

  return []
    .concat(
      ["", `--`, `-- update json migrations`, `--`],
      updateJsonMigrations,
      ["", `--`, `-- insert migrations`, `--`],
      insertMigrations,
      ["", `--`, `-- update migrations`, `--`],
      updateMigrations,
      ["", `--`, `-- delete migrations`, `--`],
      deleteMigrations
    )
    .join("\n");
}

function getSqlJsonUpdates(data) {
  const notebook_focus = data
    .filter(({ type }) => type === "situation")
    .map(
      ({ oldValue, newValue }) =>
        ` UPDATE notebook_focus set situations = situations - '${oldValue.replace(
          /'/g,
          "''"
        )}' || '["${newValue.replace(
          /'/g,
          "''"
        )}"]'::jsonb  WHERE situations ? '${oldValue.replace(/'/g, "''")}';`
    );

  const notebook_target = data
    .filter(({ type }) => type === "objectif")
    .map(
      ({ oldValue, newValue }) =>
        `UPDATE public.notebook_target SET target='${newValue.replace(
          /'/g,
          "''"
        )}' WHERE target= '${oldValue.replace(/'/g, "''")}';`
    );
  const notebook_action = data
    .filter(({ type }) => type === "action")
    .map(
      ({ oldValue, newValue }) =>
        `UPDATE public.notebook_action SET action='${newValue.replace(
          /'/g,
          "''"
        )}' WHERE action= '${oldValue.replace(/'/g, "''")}';`
    );

  return notebook_focus.concat(notebook_target, notebook_action).join(`\n`);
}

function getSqlInserts(data) {
  return data
    .filter(unique)
    .map(
      ({ theme, type, newValue }) =>
        `INSERT INTO public.ref_${typeTable(
          type
        )} (description, theme) VALUES('${newValue.replace(
          /'/g,
          "''"
        )}', '${theme}');`
    );
}

function getSqlUpdates(data) {
  return data.map(
    ({ theme, type, newValue, oldValue }) =>
      `UPDATE public.ref_${typeTable(
        type
      )} SET description = '${newValue.replace(
        /'/g,
        "''"
      )}' WHERE theme='${theme}' AND description='${oldValue.replace(
        /'/g,
        "''"
      )}';`
  );
}
function getDeleteUpdates(data) {
  return data.map(
    ({ theme, type, oldValue }) =>
      `DELETE FROM public.ref_${typeTable(
        type
      )} WHERE theme='${theme}' AND description='${oldValue.replace(
        /'/g,
        "''"
      )}';`
  );
}
function unique({ newValue }, i, data) {
  if (i === 0) return true;
  return (
    data
      .slice(0, i)
      .find(({ newValue: prevNewValue }) => prevNewValue === newValue) ===
    undefined
  );
}

function typeTable(type) {
  switch (type.toLowerCase()) {
    case "situation":
      return "situation";
    case "objectif":
      return "target";
    case "action":
      return "action";
  }
}
