/**
 * Parses a single line of a CSV string, respecting quotes.
 * @param {string} line The CSV line to parse.
 * @returns {string[]} An array of strings representing the columns.
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Toggle the inQuotes flag. If the next char is also a quote, it's an escaped quote.
      if (inQuotes && line[i+1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, '')); // Remove surrounding quotes from values
}

/**
 * Parses a CSV string into an array of objects.
 * @param {string} csvText The full CSV text.
 * @returns {object[]} An array of objects, where each object represents a row.
 */
export function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const frontIndex = headers.indexOf('front');
  const backIndex = headers.indexOf('back');
  const hintIndex = headers.indexOf('hint');
  const tagsIndex = headers.indexOf('tags');

  if (frontIndex === -1 || backIndex === -1) {
    console.error('CSV must have "front" and "back" columns.');
    return [];
  }

  const cardsData = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > Math.max(frontIndex, backIndex)) {
      cardsData.push({
        question: values[frontIndex] || '',
        answer: values[backIndex] || '',
        hint: hintIndex > -1 ? (values[hintIndex] || '') : '',
        category: tagsIndex > -1 ? (values[tagsIndex] || 'Geral') : 'Geral',
      });
    }
  }
  return cardsData;
}


/**
 * Generates a unique ID.
 * @returns {string} A unique ID string.
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Truncates text to a maximum length.
 * @param {string} text The text to truncate.
 * @param {number} maxLength The maximum length.
 * @returns {string} The truncated text.
 */
export function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
