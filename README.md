# FlowEngine V4 Builder

Visual flow builder for **FlowEngine V4** agent JSON: import flows, edit nodes on a canvas, and export valid JSON. Built with **React 18**, **Vite**, **@xyflow/react** (React Flow v12), **Ant Design 5**, **Tailwind CSS**, and **@dagrejs/dagre** for auto-layout.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node), or **pnpm** / **yarn** if your team prefers

Check versions:

```bash
node -v
npm -v
```

---

## Installation

Clone or copy this repo, then install dependencies from the project root:

```bash
cd v3-builder-ui
npm install
```

---

## Running locally (development)

Start the Vite dev server with hot reload:

```bash
npm run dev
```

Open the URL shown in the terminal (usually **http://localhost:5173**).

---

## Production build

Create an optimized build in `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Then open the URL printed by Vite (often **http://localhost:4173**).

---

## What you can do in the app

- **Import** FlowEngine V4 JSON (paste or upload a `.json` file)
- **Edit** nodes on the canvas and in the right-hand panel
- **Export** JSON (copy or download)
- Use **Auto layout** on the toolbar to re-run graph layout after moving nodes
- Adjust **flow settings** (gear icon): name, start node, variables, LLM defaults, interrupts

---

## Troubleshooting

| Issue | What to try |
|--------|-------------|
| `npm install` fails | Use Node 18+; delete `node_modules` and `package-lock.json`, then `npm install` again |
| Port already in use | Vite will suggest another port, or run `npm run dev -- --port 3000` |
| Blank page after build | Open browser devtools console; ensure you’re serving `dist/` from a proper HTTP server or use `npm run preview` |

---

## Project scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |

---

## License

Private / internal use unless otherwise specified by your organization.
