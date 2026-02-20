# NAIV React Bundler

Transform react file sources (tsx) into single html output. This bundler includes TailwindCSS v4 means you can use tailwind class on your react code.

## Installation

```bash
npm install --save @naiv/react-bundler
```

## Usage

```ts
import fs from 'node:fs';
import path from 'node:path';
import { bundleHTML, FileSource } from '@naiv/react-bundler';

async function main() {
  const logoComponent: FileSource = {
    path: 'components/Logo.tsx',
    content: `
import React from 'react';
export function Logo() {
  return (
    <div className="flex items-center space-x-2 bg-white p-3 rounded-full shadow-sm border border-teal-100 mb-6">
      <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">N</div>
      <div className="font-bold text-teal-800">Naiv Modularity</div>
    </div>
  );
}
`
  };

  const entryPointCode = `
import { createRoot } from 'react-dom/client';
import React from 'react';
import { Logo } from './components/Logo';

function App() {
  return <div className='flex flex-col items-center text-teal-600 justify-center min-h-screen bg-teal-50'>
    <Logo />
    <div className="text-5xl font-extrabold mb-6 tracking-tight text-teal-900">Hello Standalone World</div>
    <div className="p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md text-center">
      <p className="text-lg text-teal-700 leading-relaxed">
        Everything you see here is bundled programmatically into a <span className="font-bold text-teal-600">single HTML file</span>.
      </p>
      <div className="mt-6 flex justify-center space-x-3">
        <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-md text-sm font-medium">Tailwind v4</span>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">esbuild</span>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm font-medium">React</span>
      </div>
    </div>
  </div>;
}

const doc = document.getElementById('root');
if (doc) {
  const root = createRoot(doc);
  root.render(<App />);
}
`;

  const html = await bundleHTML(entryPointCode, [logoComponent]);

  const outputPath = path.resolve(process.cwd(), 'index.html');
  fs.writeFileSync(outputPath, html);
}

main().catch(console.error).finally(() => process.exit(0));
```

Example code above will produce a single `index.html` file.
