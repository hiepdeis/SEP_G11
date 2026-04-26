const fs = require('fs');
const path = require('path');

const dirsToScan = [
    'e:/SEP_G11/MatCost/app',
    'e:/SEP_G11/MatCost/components',
    'e:/SEP_G11/MatCost/lib',
    'e:/SEP_G11/MatCost/hooks'
];

const translationJsonPath = 'e:/SEP_G11/MatCost/public/locales/vi/translation.json';

const extensionsToScan = ['.js', '.jsx', '.ts', '.tsx'];

// Regex to capture t("something") or t('something') or t(`something`)
const tRegex = /\bt\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;

let allKeys = new Set();

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.warn(`Warning: Directory does not exist: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (stat.isFile() && extensionsToScan.includes(path.extname(fullPath))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            let match;
            while ((match = tRegex.exec(content)) !== null) {
                const key = match[2];
                if (key && key.trim() !== '') {
                    // Xử lý escape character nếu có
                    const unescapedKey = key.replace(/\\(.)/g, '$1');
                    allKeys.add(unescapedKey);
                }
            }
        }
    }
}

// 1. Scan directories
console.log("Bat dau quet cac thu muc...");
dirsToScan.forEach(dir => scanDirectory(dir));
console.log(`Tim thay ${allKeys.size} keys unique trong source code.`);

// 2. Read existing translation.json
let translations = {};
if (fs.existsSync(translationJsonPath)) {
    const rawData = fs.readFileSync(translationJsonPath, 'utf8');
    try {
        translations = JSON.parse(rawData);
    } catch (e) {
        console.error("Loi khi doc file translation.json hien tai:", e);
        process.exit(1);
    }
} else {
    console.warn(`Khong tim thay file ${translationJsonPath}, se tao moi.`);
}

// 3. Add missing keys
let addedCount = 0;
allKeys.forEach(key => {
    if (!translations.hasOwnProperty(key)) {
        // Cho gia tri mac dinh bang chinh key cua no, 
        // ban co the sua lai o file translation.json sau.
        translations[key] = key;
        addedCount++;
    }
});

// 4. Save back to translation.json
if (addedCount > 0) {
    fs.writeFileSync(translationJsonPath, JSON.stringify(translations, null, 2), 'utf8');
    console.log(`Da them ${addedCount} keys moi vao file translation.json.`);
} else {
    console.log("Khong co key moi nao. translation.json da duoc cap nhat day du.");
}
