import { compile } from 'tailwindcss';
import fs from 'node:fs';
import path from 'node:path';
import { build, transform, Plugin } from 'esbuild';

export interface FileSource {
  path: string
  content: string
}

// Generates and minifies Tailwind CSS using Tailwind v4 API
export async function generateCSS(source: string, other_sources: FileSource[]): Promise<string> {
  // Find the Tailwind base CSS file
  const tailwind_main_css_path = path.resolve(process.cwd(), 'node_modules/tailwindcss/index.css');
  const base_css = fs.readFileSync(tailwind_main_css_path, 'utf8');

  // Load the design system with the base CSS
  const compiler = await compile(base_css, {
    base: path.dirname(tailwind_main_css_path),
    loadStylesheet: async (id, base) => {
      const resolved_path = path.resolve(base, id);
      return {
        content: fs.readFileSync(resolved_path, 'utf8'),
        base: path.dirname(resolved_path),
        path: resolved_path
      };
    }
  });

  // Extract candidates from all sources
  const all_contents = [source, ...other_sources.map(s => s.content)];
  const candidates = all_contents
    .flatMap(content => Array.from(content.matchAll(/(?:className|class)\s*=\s*["']([^"']+)["']/g)))
    .flatMap(match => (match[1] || '').split(/\s+/))
    .filter(Boolean);

  // Build the CSS
  const css = compiler.build(candidates);

  // Minify CSS using esbuild
  const minified_css = await transform(css, { loader: 'css', minify: true });
  return minified_css.code;
}

// esbuild plugin to resolve virtual files from other_sources.
function virtualFsPlugin(other_sources: FileSource[]): Plugin {
  return {
    name: 'virtual-fs',
    setup(build) {
      // resolve IDs for virtual files
      build.onResolve({ filter: /^\.\.?\// }, args => {
        // Normalize the path relative to the current directory
        // In this simple example, we assume everything is relative to cwd
        let relative_path = path.join(args.resolveDir, args.path.replace(/^\.\//, ''));
        relative_path = path.relative(process.cwd(), relative_path);

        // Try to match with extensions
        const possiblePaths = [
          relative_path,
          relative_path + '.tsx',
          relative_path + '.ts',
          relative_path + '.jsx',
          relative_path + '.js',
        ];

        const match = other_sources.find(s => possiblePaths.includes(s.path));
        if (match) {
          return { path: match.path, namespace: 'virtual' };
        }
        return null;
      });

      // Load the content for virtual files
      build.onLoad({ filter: /.*/, namespace: 'virtual' }, args => {
        const match = other_sources.find(s => s.path === args.path);
        if (match) {
          return {
            contents: match.content,
            loader: args.path.endsWith('.tsx') ? 'tsx' : args.path.endsWith('.ts') ? 'ts' : 'js',
            resolveDir: process.cwd(), // crucial for resolving node_modules
          };
        }
        return null;
      });
    },
  };
}

export async function bundleJS(source: string, other_sources: FileSource[]): Promise<string> {
  const result = await build({
    stdin: {
      contents: source,
      loader: 'tsx',
      resolveDir: process.cwd(),
      sourcefile: 'index.tsx',
    },
    bundle: true,
    minify: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    plugins: [virtualFsPlugin(other_sources)],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  return result.outputFiles ? result.outputFiles[0]?.text || '' : '';
}

export interface PageMetadata {
  title?: string
  description?: string
}

export async function bundleHTML(source: string, other_sources: FileSource[], metadata?: PageMetadata): Promise<string> {
  const css = await generateCSS(source, other_sources);
  const js = await bundleJS(source, other_sources);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata?.title ?? 'My Page'}</title>
    <meta name="${metadata?.description || ''}">
    <style>${css}</style>
</head>
<body>
    <div id="root"></div>
    <script>${js}</script>
</body>
</html>`;

  return html;
}
