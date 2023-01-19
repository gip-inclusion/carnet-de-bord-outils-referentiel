const json = require("./oldReferentiel.json");
const separator = ",";
const headerLine = `Theme${separator}Type${separator}Label`;
const toCsvLine =
  (type) =>
  ({ theme, description }) => {
    return `${theme}${separator}${type}${separator}${description}`;
  };

const toCsvSituation = toCsvLine("situation");
const toCsvTarget = toCsvLine("objectif");
const toCsvAction = toCsvLine("action");

const situations = json.data.ref_situation.map(toCsvSituation);
const objectifs = json.data.ref_target.map(toCsvTarget);
const actions = json.data.ref_action.map(toCsvAction);

console.log([].concat(headerLine, situations, objectifs, actions).join("\n"));
