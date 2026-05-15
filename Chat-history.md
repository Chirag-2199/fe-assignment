# 🗂️ File Explorer — Build History

A VS Code-style file explorer built with React (Vite), developed iteratively through the following steps.

---

## Assignment Brief

**Client:** Storebox · Frontend Engineer Assignment

**Goal:** A running web app in the browser with a VS Code-style file explorer that supports:

- Create a file
- Create a folder
- Edit (rename) a file
- Edit (rename) a folder
- Delete a file
- Delete a folder

The home screen must have two buttons: one for creating a file, one for creating a folder. Folders can be nested.

---

## Iteration 1 — Initial Build

**Request:** Replace the default Vite `App.jsx` boilerplate with a fully functional VS Code-style file explorer.

**What was built:**

- `App.jsx` written from scratch — all logic and styles are self-contained, no external UI library
- Two toolbar buttons: **+ New File** and **+ New Folder**
- Tree rendering with recursive `TreeNode` component supporting infinite folder nesting
- Collapsible folders with animated chevron icons
- Inline rename editing — click the pencil icon, type, press Enter to confirm or Escape to cancel
- Delete button per node (file or folder)
- File-type color-coded icons based on extension (`.tsx` → blue, `.json` → orange, `.css` → indigo, `.md` → white, etc.)
- Folder icons with open/closed fill states
- Smart creation logic — if a folder is selected, new items are created inside it; otherwise created at root
- Inline input appears in the tree at the correct depth level
- macOS-style window chrome (traffic lights: red / yellow / green)
- Status bar showing live file and folder count
- Initial tree pre-populated with a realistic `src/` project structure
- Font: **JetBrains Mono** loaded from Google Fonts

---

## Iteration 2 — Full Screen + Left Alignment

**Request:** Make the explorer full screen, bring icons and filenames closer together, and left-align the tree with a small left margin.

**Changes made:**

- Removed the centered card layout (`width: 460px`, `borderRadius`, `boxShadow`)
- Layout changed to `height: 100vh; width: 100vw; flex-direction: column` — fills the entire browser window
- Tree scrolls independently inside a `flex: 1; overflow-y: auto` container
- `html, body, #root { height: 100% }` added to the inline style tag
- Base left padding set to `12px` (was `8px`) — gives a clean left breathing room without being excessive
- Indent per depth level: `12 + depth × 16px`
- Icon-to-filename gap reduced from `5px` → `3px`
- Chevron and icon wrapped in dedicated `<span>` containers to keep alignment consistent at all nesting levels

---

## Iteration 3 — Persist Data Across Refresh

**Request:** Data was being lost on page refresh — fix it.

**Root cause:** Tree state was held only in React memory (`useState(INIT_TREE)`). On reload, React re-initialises from the constant.

**Fix applied:**

| Concern | Solution |
|---|---|
| Tree structure | Serialised to `localStorage` under key `fe-tree` on every `setTree` call |
| First load | `useState(loadTree)` — lazy initialiser reads from `localStorage` before first render, no flicker |
| ID counter | `_id` persisted to `localStorage` under `fe-next-id` so new nodes after reload never get duplicate IDs |
| Write path | A `setTree` wrapper function ensures every tree mutation — create, rename, delete, toggle — triggers `saveTree()` automatically |

```js
// Pattern used throughout
function setTree(updater) {
  setTreeRaw(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater
    saveTree(next)   // ← write to localStorage on every change
    return next
  })
}
```

---

## File Structure

```
src/
└── App.jsx        ← entire app: state, tree logic, icons, styles
src/
└── index.css      ← full CSS reset (clears Vite defaults)
```

> `App.css` can be emptied or deleted — all styles are handled inline inside `App.jsx`.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 (via Vite) |
| Styling | Inline styles (no CSS-in-JS library) |
| Font | JetBrains Mono (Google Fonts) |
| Persistence | `localStorage` |
| Icons | Inline SVG (hand-crafted) |
| State | `useState` + recursive tree utilities |

---

## Key Utilities

```js
mapTree(nodes, fn)          // transform every node in the tree
filterTree(nodes, predicate) // remove nodes matching a condition
insertInto(nodes, parentId, newNode) // add a node inside a specific folder
findNode(nodes, id)         // locate a node by ID (depth-first)
countNodes(nodes)           // return { files, folders } counts recursively
```

---

*Built with Claude (claude.ai) — Anthropic*
