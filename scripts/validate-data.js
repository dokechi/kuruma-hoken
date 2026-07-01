const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const cases = readJson('data/model-cases.json');
const sources = readJson('data/source-registry.json');
const sourceIds = new Set(sources.map((source) => source.id));
const allowedRiskLevels = new Set(['high', 'medium', 'low']);
const errors = [];

sources.forEach((source, index) => {
  if (!source.verifiedAt) errors.push(`source-registry[${index}] (${source.id || 'idなし'}): verifiedAt が存在しません`);
});

cases.forEach((modelCase, caseIndex) => {
  const label = `${modelCase.id || `case[${caseIndex}]`}`;
  if (!modelCase.finalNotice) errors.push(`${label}: finalNotice が存在しません`);
  if (!Array.isArray(modelCase.evidenceClaims) || modelCase.evidenceClaims.length === 0) {
    errors.push(`${label}: evidenceClaims が空、または配列ではありません`);
    return;
  }
  modelCase.evidenceClaims.forEach((claim, claimIndex) => {
    const claimLabel = `${label}.evidenceClaims[${claimIndex}]`;
    ['claim', 'whyItMatters', 'appliesTo', 'riskLevel', 'displayGroup'].forEach((field) => {
      if (!claim[field]) errors.push(`${claimLabel}: ${field} が存在しません`);
    });
    if (!Array.isArray(claim.sourceIds) || claim.sourceIds.length === 0) {
      errors.push(`${claimLabel}: sourceIds が空、または配列ではありません`);
    } else {
      claim.sourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) errors.push(`${claimLabel}: 存在しない sourceId (${sourceId}) を参照しています`);
      });
    }
    if (!allowedRiskLevels.has(claim.riskLevel)) {
      errors.push(`${claimLabel}: riskLevel は high / medium / low のいずれかにしてください (${claim.riskLevel})`);
    }
  });
});

if (errors.length) {
  console.error('data validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`data validation passed: ${cases.length} cases, ${sources.length} sources`);
