// Testprogramm für Zeitautomatik-API (ohne SPS, mit Beispieldaten aus Log)
// Führt einen lokalen Test der parseZeitautomatikResponse-Funktion durch
import { parseZeitautomatikResponse } from './server/index.js';

// Beispiel-HEX aus Log (eine echte Zeitautomatik-Antwort, ggf. anpassen)
const exampleHex = '022e4100010669570080fff48169580080fffa1e69590080f81400695a0080f81b00695b0080f8143c695c0080f81abc039711';

// Hilfsfunktion: HEX-String zu Buffer
function hexToBuffer(hex) {
  return Buffer.from(hex.replace(/[^0-9a-fA-F]/g, ''), 'hex');
}

function main() {
  const buffer = hexToBuffer(exampleHex);
  const result = parseZeitautomatikResponse(buffer);
  console.log('Test-Ergebnis (aus Log-Beispiel):');
  console.dir(result, { depth: null });
}

main();
