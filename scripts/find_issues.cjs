const fs = require('fs');
const path = require('path');
const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const issues = [];
files.forEach(f => {
    const code = fs.readFileSync(path.join(dir, f), 'utf-8');
    const lines = code.split('\n');
    lines.forEach((l, i) => {
        // Find lines that have className="...something..." but checking for hardcoded light theme colors
        // We only care about lines that DO NOT have isDark check inside them (or have hardcoded string classNames)
        if (l.includes('className="') && (l.includes('bg-white') || l.includes('bg-slate-50') || l.includes('text-slate-800') || l.includes('text-slate-900')) && !l.includes('${isDark')) {
            issues.push(`${f}:${i + 1}: ${l.trim()}`);
        }
    });
});
fs.writeFileSync('theme_issues.txt', issues.join('\n'), 'utf-8');
