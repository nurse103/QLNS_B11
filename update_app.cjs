const fs = require('fs');
const filePath = 'd:\\OneDrive\\Code webapp\\QLNS_B11\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Detect line endings
const EOL = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(/\r?\n/);

// Find PersonnelList block (580 to 1697)
const startIdx = lines.findIndex(l => l.trim().startsWith('const PersonnelList = () => {'));
const endIdx = lines.findIndex(l => l.trim().startsWith('const PlaceholderPage = ({ title }: { title: string }) => ('));

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find start or end hook.');
    console.error('Start hook found at:', startIdx);
    console.error('End hook found at:', endIdx);
    process.exit(1);
}

// Keep lines before startIdx
// Keep lines starting from endIdx
const part1 = lines.slice(0, startIdx);
const part2 = lines.slice(endIdx);

// Add import to part1
const importIdx = part1.findIndex(l => l.includes("import { PartyModule }"));
if (importIdx !== -1) {
    part1.splice(importIdx + 1, 0, "import { PersonnelList } from './components/PersonnelList';");
} else {
    // Fallback: search for imports block end
    const lastImport = part1.map((l, i) => l.startsWith('import') ? i : -1).filter(i => i !== -1).pop();
    if (lastImport !== undefined) {
        part1.splice(lastImport + 1, 0, "import { PersonnelList } from './components/PersonnelList';");
    } else {
        part1.splice(50, 0, "import { PersonnelList } from './components/PersonnelList';");
    }
}

const newContent = [...part1, ...part2].join(EOL);
fs.writeFileSync(filePath, newContent);
console.log('App.tsx updated successfully.');
