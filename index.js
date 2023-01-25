const { type } = require("os");
const xlsxFile = require("read-excel-file/node");

main();

async function main() {
  console.log("-- up.sql");
  await xlsxFile("./referentiel.xlsx")
    .then(parseRow)
    .then(generateSqlForUp)
    .then(console.log);

  console.log("-- down.sql");
  await xlsxFile("./referentiel.xlsx")
    .then(parseRow)
    .then(generateSqlForDown)
    .then(console.log);
}

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

function generateSqlForUp(data) {
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

  return generateSql({ 
    updateJsonMigrations, 
    insertMigrations,
    updateMigrations,
    deleteMigrations,
  });
}

function generateSqlForDown(data) {
  const updateJsonMigrations = getSqlJsonUpdates(
    data.filter(({ action }) => action === "modifier" || action === "fusionner"),
    { forDownMigration: true },
  );
  const insertMigrations = getSqlInserts(
    data.filter(({ action }) => action === "supprimer" || action == "fusionner"),
    { forDownMigration: true },
  );
  const updateMigrations = getSqlUpdates(
    data.filter(({ action }) => action === "modifier"),
    { forDownMigration: true },
  );
  const deleteMigrations = getDeleteUpdates(
    data.filter(({ action }) => action === "ajouter"),
    { forDownMigration: true },
  );

  return generateSql({ 
    updateJsonMigrations, 
    insertMigrations,
    updateMigrations,
    deleteMigrations,
  });
}

function generateSql({ updateJsonMigrations, insertMigrations, updateMigrations, deleteMigrations }) {
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

function getSqlJsonUpdates(data, { forDownMigration } = { forDownMigration: false }) {
  const notebook_focus = data
    .filter(({ type }) => type === "situation")
    .map(
      ({ oldValue, newValue }) => {
        const valueToReplace = forDownMigration ? newValue : oldValue;
        const replacementValue = forDownMigration ? oldValue : newValue;
        return `UPDATE public.notebook_focus set situations = situations - '${valueToReplace.replace(
          /'/g,
          "''"
        )}' || '["${replacementValue.replace(
          /'/g,
          "''"
        )}"]'::jsonb  WHERE situations ? '${valueToReplace.replace(/'/g, "''")}';`
      });

  const notebook_target = data
    .filter(({ type }) => type === "objectif")
    .map(
      ({ oldValue, newValue }) => {
        const valueToReplace = forDownMigration ? newValue : oldValue;
        const replacementValue = forDownMigration ? oldValue : newValue;
        return `UPDATE public.notebook_target SET target='${replacementValue.replace(
          /'/g,
          "''"
        )}' WHERE target= '${valueToReplace.replace(/'/g, "''")}';`
      });
  const notebook_action = data
    .filter(({ type }) => type === "action")
    .map(
      ({ oldValue, newValue }) => {
        const valueToReplace = forDownMigration ? newValue : oldValue;
        const replacementValue = forDownMigration ? oldValue : newValue;
        return `UPDATE public.notebook_action SET action='${replacementValue.replace(
          /'/g,
          "''"
        )}' WHERE action= '${valueToReplace.replace(/'/g, "''")}';`
      });

  return notebook_focus.concat(notebook_target, notebook_action).join(`\n`);
}

function getSqlInserts(data, { forDownMigration } = { forDownMigration: false }) {
  return data
    .filter(unique)
    .map(
      ({ theme, type, oldValue, newValue }) => {
        const replacementValue = forDownMigration ? oldValue : newValue;
        return `INSERT INTO public.ref_${typeTable(
          type
        )} (description, theme) VALUES('${replacementValue.replace(
          /'/g,
          "''"
        )}', '${theme}');`
      });
}

function getSqlUpdates(data, { forDownMigration } = { forDownMigration: false }) {
  return data.map(
    ({ theme, type, newValue, oldValue }) => {
      const valueToReplace = forDownMigration ? newValue : oldValue;
      const replacementValue = forDownMigration ? oldValue : newValue;
      return `UPDATE public.ref_${typeTable(
        type
      )} SET description = '${replacementValue.replace(
        /'/g,
        "''"
      )}' WHERE theme='${theme}' AND description='${valueToReplace.replace(
        /'/g,
        "''"
      )}';`
    });
}
function getDeleteUpdates(data, { forDownMigration } = { forDownMigration: false }) {
  return data.map(
    ({ theme, type, oldValue, newValue }) => {
      const valueToReplace = forDownMigration ? newValue : oldValue;
      return `DELETE FROM public.ref_${typeTable(
        type
      )} WHERE theme='${theme}' AND description='${valueToReplace.replace(
        /'/g,
        "''"
      )}';`
    });
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
