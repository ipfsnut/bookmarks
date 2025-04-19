// This script processes the 2021BISAC.json file (which is actually CSV) into the format we need
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the existing 2021BISAC.json file (which is actually CSV)
const rawData = fs.readFileSync(path.join(__dirname, '../../public/2021BISAC.json'), 'utf8');

// Parse CSV data
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    // Skip empty lines
    if (!lines[i].trim()) continue;
    
    // Parse CSV line, handling quoted fields
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of field
        fields.push(currentField);
        currentField = '';
      } else {
        // Add character to current field
        currentField += char;
      }
    }
    
    // Add the last field
    fields.push(currentField);
    
    // Create object from fields
    if (i === 0) {
      // First line is headers
      continue;
    } else {
      result.push({
        Code: fields[0],
        Description: fields[1],
        Comment: fields[2] || ''
      });
    }
  }
  
  return result;
}

// Parse the CSV data
const rawEntries = parseCSV(rawData);

// Process the codes to add hierarchy information
const processedCodes = rawEntries
  .filter(entry => entry.Code && entry.Description) // Skip any entries without code or description
  .map(entry => {
    const parts = entry.Description.split(' / ');
    const mainCategory = parts[0];
    
    return {
      code: entry.Code,
      description: entry.Description,
      mainCategory,
      subCategory: parts.length > 1 ? parts.slice(1).join(' / ') : null,
      level: parts.length
    };
  });

// Group codes by main category for easier browsing
const categoriesMap = {};
processedCodes.forEach(code => {
  if (!categoriesMap[code.mainCategory]) {
    categoriesMap[code.mainCategory] = [];
  }
  categoriesMap[code.mainCategory].push(code);
});

// Create the final data structure
const finalData = {
  codes: processedCodes,
  categories: Object.keys(categoriesMap).sort().map(category => ({
    name: category,
    count: categoriesMap[category].length
  }))
};

// Create the data directory if it doesn't exist
const dataDir = path.join(__dirname, '../../public/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write the processed data to a file
fs.writeFileSync(
  path.join(dataDir, 'bisac-codes.json'),
  JSON.stringify(finalData, null, 2)
);

console.log(`Processed ${processedCodes.length} BISAC codes into ${finalData.categories.length} categories`);