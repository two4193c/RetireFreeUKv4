const fs = require('fs');
let path = 'src/components/Header.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/\r\n/g, '\n');

const patch = `            {/* Quick New Plan Action Icon Button */}
            {onNewScenario && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewScenario();
                }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-400 transition-all shadow-2xs hover:shadow-xs cursor-pointer group shrink-0"
                title="Create New Plan"
                aria-label="Create new plan"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-400 transition-transform group-hover:scale-110" />
                <span className="hidden sm:inline text-xs font-bold">New</span>
              </button>
            )}

            {/* Dropdown Menu */}`;

c = c.replace(/\{\/\* Dropdown Menu \*\/\}/, patch);
fs.writeFileSync(path, c);
console.log('Patched Header.tsx');
