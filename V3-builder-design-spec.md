
# FlowEngine Visual Builder — Design Spec

## Overview
React Flow-based visual builder for FlowEngine V4 agent JSON. Must support round-trip JSON import/export matching the exact schema. Target users: semi-technical to non-technical (drag-and-drop feel). **Use Ant Design components.**

---

## Layout Architecture

| Zone | Position | Width | Content |
|------|----------|-------|---------|
| **Top bar** | Fixed top | Full width | Flow name (editable), gear icon (flow settings), Import JSON btn, Export JSON btn |
| **Canvas** | Center | Remaining | React Flow canvas with nodes, edges, minimap, zoom controls |
| **Floating toolbar** | Top-left of canvas | Auto | "+ Add Node" dropdown, Undo, Redo |
| **Right panel** | Right side | 300px | Node config OR Flow settings (contextual), collapsible |
| **Zoom controls** | Bottom-left of canvas | Auto | -, percentage, + |
| **Minimap** | Bottom-right of canvas | Auto | React Flow minimap component |

---

## Node Visual Design — 8 Types

All nodes share this card anatomy:
- Left accent border (4px, type-specific color)
- Icon + TYPE label in accent color
- Node ID as bold name
- One-line summary (truncated)
- Connection handles: left = input, right = output(s)

| Type | Color | Icon | Summary Content |
|------|-------|------|-----------------|
| **Prompt** | `#38bdf8` (sky) | 💬 | First line of message text |
| **Variable Capture** | `#a78bfa` (purple) | 📥 | Comma-separated var names |
| **Decision** | `#f59e0b` (amber) | 🔀 | "N cases + default" |
| **API** | `#fb923c` (orange) | 🌐 | METHOD + endpoint path |
| **Tool** | `#34d399` (emerald) | 🛠 | tool_description text |
| **Update Vars** | `#818cf8` (indigo) | ✏️ | "Sets N variables" |
| **End** | `#f87171` (red) | 🔴 | First line of final message |
| **LLM Router** | `#facc15` (yellow) | 🧠 | "N options · listen: true/false" |

### Special node behaviors
- **Start node**: Green ring/badge indicator on whichever node is set as `start`
- **Decision / LLM Router**: Multiple output handles — one per route/option + one for default (dashed)
- **End node**: No output handle (terminal)

---

## Add Node Dropdown

Triggered from "+ Add Node" button in floating toolbar. Grouped popover:

**COMMUNICATION**: Prompt ("Display a message or ask a question"), End ("End the conversation")

**DATA**: Variable Capture ("Extract info from user input via LLM"), Update Variables ("Set or update conversation variables")

**LOGIC**: Decision ("Route based on conditions or rules"), LLM Router ("Intelligent routing via AI classification")

**INTEGRATION**: API ("Call an external HTTP endpoint"), Tool ("Run custom Python code")

- Search filter at top
- On click: node placed at canvas center, auto-selected, side panel opens
- Auto-generated ID: `prompt_1`, `decision_2`, etc. (editable in panel)

---

## Right Side Panel — Node Config

Panel opens when a node is clicked. Closes on ESC or clicking empty canvas.

### Common structure (all types)
1. **Header**: Icon + type badge + editable Node ID field
2. **Core config**: Type-specific fields (see below)
3. **Routing section**: Next node dropdown OR cases/options list
4. **Advanced** (collapsed): Model override, error handling
5. **Delete Node** button (destructive, bottom)

### Per-type config fields

#### Prompt
- Say Mode: toggle — Generative | Deterministic
- Message Text: textarea
- Instructions: textarea (one per line, maps to array)
- Model Override: optional input (placeholder "Uses flow default")
- Next Node: dropdown of all node IDs

#### Variable Capture
- Variables: tag input (comma-separated, maps to `vars[]`)
- Instructions: textarea (one per line)
- Model Override: optional
- Next Node: dropdown

#### Decision
- Mode: toggle — Deterministic | LLM
- **Deterministic mode**: List of cases, each with:
  - Condition rows: variable dropdown + operator (== / !=) + value input
  - Multiple conditions per case (AND logic)
  - Target: node ID dropdown
  - "+ Add Case" button
- **LLM mode**: Options map (key + description), output_var input
- Default Route: node ID dropdown

#### API
- Method: select (GET / POST / PUT / PATCH / DELETE)
- Endpoint: input with `${var}` highlighting
- Headers: key-value pair list with + Add
- Body: JSON editor textarea
- Timeout: number input (default 30)
- Response Mapping: key-value pairs (var name → JSONPath)
- On Error Set: key-value pairs
- Next Node: dropdown

#### Tool
- Tool Name: input
- Tool Description: input
- Tool Code: code editor textarea (monospace, with line numbers if possible)
- Tool Args: key-value pair list
- On Error Set: key-value pairs
- Next Node: dropdown

#### Update Variables
- Set: key-value pair list with + Add (key = var name, value = template string)
- Next Node: dropdown

#### End
- Say Mode: toggle — Generative | Deterministic
- Message Text: textarea
- Instructions: textarea
- Model Override: optional
- (No next node — terminal)

#### LLM Router
- Listen Mode: toggle switch (on/off)
- Confidence Threshold: number input (0.0 - 1.0)
- Extract Variables: tag input (maps to `vars[]`)
- Instructions: textarea
- Options list, each with:
  - Option key: input
  - Description: textarea
  - Target node: dropdown (or auto-created from key in simple format)
  - "+ Add Option" button
- Model Override: optional

### "Next Node" dropdowns
All dropdowns listing node targets should show the full list of node IDs in the flow, with the node type icon next to each for quick identification.

---

## Flow Settings Panel

Triggered by gear icon in top bar. Replaces node config in the right panel. 4 tabs:

### General Tab
- Flow Name: input
- Version: read-only display ("4.0.0")
- Start Node: dropdown of all node IDs
- Feature Flags: toggle switches for each flag

### Variables Tab
- Count display ("28 variables defined")
- Search filter
- Scrollable list of variables, each showing: name, description, type badge
- Click to expand/edit: name, type (string/number/boolean/array/object), description
- "+ Add" button at top

### LLM Tab
- Default Model: input (e.g., "azure:gpt-4.1-mini")
- Global Instructions: textarea list (one per line, maps to array)
- Agent Persona: textarea

### Interrupts Tab
- Count display
- List of interrupts, each showing: key name, description (truncated), target node (color-coded badge)
- Click to expand/edit: key, description textarea, target (dropdown or system behavior like "REITERATE")
- "+ Add" button

---

## Canvas Interactions

### Connections
- Drag from output handle to input handle to create edge
- Valid targets glow on drag, invalid ones dim
- **Simple nodes** (Prompt, Capture, API, Tool, Update Vars): single output → creates `next.goto` edge
- **Decision node**: one output per case + default output (dashed edge)
- **LLM Router**: one output per option (labeled with option key)
- **End node**: no output handle
- No self-loops allowed
- Edge labels: show case condition text or option key

### Selection & Delete
- Click node → select + open panel
- Shift+click → multi-select
- Drag box on empty canvas → multi-select
- Backspace on selected node(s) → delete with confirmation if node has config
- Click edge → select edge (highlight), Backspace to delete
- Ctrl+Z / Ctrl+Shift+Z → undo/redo

### Canvas navigation
- Drag empty canvas → pan
- Scroll wheel → zoom
- +/- buttons (bottom-left) → zoom
- Minimap (bottom-right) → click to jump
- Fit view button or double-click minimap

---

## JSON Round-Trip

### Import (JSON → Canvas)
1. Top bar "Import JSON" button opens modal
2. User pastes JSON or uploads .json file
3. Validate against FlowEngine V4 schema
4. Parse `nodes` dict → React Flow nodes (each key = node ID, value = node data)
5. Parse `next.goto`, `routes.cases[].target.goto`, `options.{key}.target.goto` → React Flow edges
6. Auto-layout using dagre/elkjs algorithm for initial node positions
7. Populate flow settings from top-level fields (version, start, variables_schema, llm_defaults, interrupts, feature_flags)

### Export (Canvas → JSON)
1. Top bar "Export JSON" button
2. Serialize each React Flow node → FlowEngine node object (keyed by node ID)
3. Map simple edges → `next.goto`
4. Map labeled Decision edges → `routes.cases[].target.goto` + default
5. Map labeled LLM Router edges → `options.{key}.target` or auto-target
6. Merge flow settings (variables_schema, llm_defaults, interrupts, feature_flags)
7. Output exact JSON matching FlowEngine V4 schema
8. Options: Download .json file OR copy to clipboard

### Edge → JSON mapping

| Edge type | JSON output |
|-----------|-------------|
| Simple edge (Prompt, Capture, etc.) | `"next": { "goto": "target_node_id" }` |
| Decision case edge (labeled) | `routes.cases[n].target.goto` |
| Decision default edge (dashed) | `routes.default.goto` |
| LLM Router option edge (labeled) | `options.{key}.target.goto` (full format) |
| LLM Router auto (simple format) | Option key = target node ID |

---

## Execution Decides
- Exact pixel dimensions and spacing
- Ant Design component mapping (which AntD components for each field type)
- Dark/light theme implementation
- Code editor component choice for Tool node (Monaco vs CodeMirror)
- Dagre layout algorithm tuning for node positioning
- Animation and transition details
- Responsive behavior (if any)
- Empty state design for fresh canvas
