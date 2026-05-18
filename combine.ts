import fs from 'fs';

const p1 = fs.readFileSync('./LeadsPanel.tsx.part1', 'utf-8');
const p2 = fs.readFileSync('./LeadsPanel.tsx.part2', 'utf-8');
const p3 = fs.readFileSync('./LeadsPanel.tsx.part3', 'utf-8');
const p4 = fs.readFileSync('./LeadsPanel.tsx.part4', 'utf-8');
const p5 = fs.readFileSync('./LeadsPanel.tsx.part5', 'utf-8');
const p6 = fs.readFileSync('./LeadsPanel.tsx.part6', 'utf-8');
const p7 = fs.readFileSync('./LeadsPanel.tsx.part7', 'utf-8');
const p8 = fs.readFileSync('./LeadsPanel.tsx.part8', 'utf-8');

fs.writeFileSync('./src/pages/LeadsPanel.tsx', p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8);

for (let i = 1; i <= 8; i++) {
  fs.unlinkSync('./LeadsPanel.tsx.part' + i);
}

fs.unlinkSync('./combine.ts');
