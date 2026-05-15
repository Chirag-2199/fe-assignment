import { useState, useRef, useEffect } from 'react'

/* ─── ID counter (persisted so IDs never collide after reload) ── */
const ID_KEY = 'fe-next-id'
let _id = parseInt(localStorage.getItem(ID_KEY) || '1', 10)
function uid() {
  const id = String(_id++)
  localStorage.setItem(ID_KEY, String(_id))
  return id
}

/* ─── Helpers ─────────────────────────────────────────── */
const makeFile = (name) => ({ id: uid(), type: 'file', name })
const makeFolder = (name, children = []) => ({ id: uid(), type: 'folder', name, children, open: true })

const INIT_TREE = [
  makeFolder('src', [
    makeFolder('components', [
      makeFile('Button.tsx'),
      makeFile('Tree.tsx'),
      makeFile('TreeNode.tsx'),
    ]),
    makeFile('App.tsx'),
    makeFile('main.tsx'),
    makeFile('index.css'),
  ]),
  makeFolder('public', []),
  makeFile('package.json'),
  makeFile('README.md'),
]

/* ─── localStorage persistence ─────────────────────────── */
const TREE_KEY = 'fe-tree'

function loadTree() {
  try {
    const raw = localStorage.getItem(TREE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { }
  return INIT_TREE
}

function saveTree(tree) {
  try { localStorage.setItem(TREE_KEY, JSON.stringify(tree)) } catch { }
}

/* ─── Deep-tree utilities ──────────────────────────────── */
function mapTree(nodes, fn) {
  return nodes.map((n) => {
    const next = fn({ ...n })
    if (next.type === 'folder') next.children = mapTree(next.children, fn)
    return next
  })
}

function filterTree(nodes, predicate) {
  return nodes.reduce((acc, n) => {
    if (!predicate(n)) return acc
    if (n.type === 'folder') return [...acc, { ...n, children: filterTree(n.children, predicate) }]
    return [...acc, n]
  }, [])
}

function insertInto(nodes, parentId, newNode) {
  return nodes.map((n) => {
    if (n.id === parentId && n.type === 'folder')
      return { ...n, open: true, children: [...n.children, newNode] }
    if (n.type === 'folder')
      return { ...n, children: insertInto(n.children, parentId, newNode) }
    return n
  })
}

/* ─── Icons ────────────────────────────────────────────── */
const EXT_COLORS = {
  tsx: '#61dafb', ts: '#3178c6', jsx: '#61dafb', js: '#f7df1e',
  css: '#264de4', json: '#cb8026', md: '#fff', html: '#e34f26',
  svg: '#ff9900', png: '#a855f7', jpg: '#ec4899', env: '#22c55e',
}

function FileIcon({ name }) {
  const ext = name.split('.').pop()?.toLowerCase()
  const color = EXT_COLORS[ext] || '#9ca3af'
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 1h7l3 3v9a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z"
        fill={color} fillOpacity=".15" stroke={color} strokeWidth="1.2" />
      <path d="M9 1v3h3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function FolderIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5l1.5 1.5H12a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V3.5z"
        fill="#e8b84b" fillOpacity={open ? '.25' : '.15'} stroke="#e8b84b" strokeWidth="1.1" />
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
      <path d="M3.5 2l3 3-3 3" stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Inline input ─────────────────────────────────────── */
function InlineInput({ defaultValue = '', onCommit, onCancel }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.select() }, [])

  function handle(e) {
    if (e.key === 'Enter') { const v = ref.current.value.trim(); if (v) onCommit(v); else onCancel() }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <input
      ref={ref}
      defaultValue={defaultValue}
      onKeyDown={handle}
      onBlur={() => { const v = ref.current?.value.trim(); if (v) onCommit(v); else onCancel() }}
      style={{
        background: '#1e2533', border: '1px solid #4f8ef7', borderRadius: 3,
        color: '#e2e8f0', fontSize: 12, padding: '1px 5px', outline: 'none',
        width: '100%', fontFamily: '"JetBrains Mono","Fira Code",monospace',
      }}
      autoFocus
    />
  )
}

/* ─── TreeNode ─────────────────────────────────────────── */
function TreeNode({ node, depth, tree, setTree, selected, setSelected, creating, setCreating }) {
  const [renaming, setRenaming] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isSelected = selected === node.id
  const indent = 12 + depth * 16

  function toggleFolder() {
    setTree(mapTree(tree, (n) => n.id === node.id ? { ...n, open: !n.open } : n))
  }

  function rename(newName) {
    setTree(mapTree(tree, (n) => n.id === node.id ? { ...n, name: newName } : n))
    setRenaming(false)
  }

  function del() {
    setTree(filterTree(tree, (n) => n.id !== node.id))
    if (selected === node.id) setSelected(null)
  }

  function handleCreatingCommit(type, name) {
    const newNode = type === 'file' ? makeFile(name) : makeFolder(name)
    setTree(insertInto(tree, node.id, newNode))
    setCreating(null)
  }

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { setSelected(node.id); if (node.type === 'folder') toggleFolder() }}
        style={{
          display: 'flex', alignItems: 'center',
          paddingLeft: indent, paddingRight: 8, height: 26,
          cursor: 'pointer', userSelect: 'none',
          background: isSelected ? 'rgba(79,142,247,0.18)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
          transition: 'background 0.1s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', width: 14, flexShrink: 0 }}>
          {node.type === 'folder' ? <ChevronIcon open={node.open} /> : null}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, minWidth: 0 }}>
          {node.type === 'folder' ? <FolderIcon open={node.open} /> : <FileIcon name={node.name} />}
          {renaming ? (
            <InlineInput defaultValue={node.name} onCommit={rename} onCancel={() => setRenaming(false)} />
          ) : (
            <span style={{ fontSize: 13, color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"JetBrains Mono","Fira Code",monospace' }}>
              {node.name}
            </span>
          )}
        </span>

        {(hovered || isSelected) && !renaming && (
          <span style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 6 }}>
            <ActionBtn title="Rename" onClick={(e) => { e.stopPropagation(); setRenaming(true) }}>
              <PencilIcon />
            </ActionBtn>
            <ActionBtn title="Delete" onClick={(e) => { e.stopPropagation(); del() }} danger>
              <TrashIcon />
            </ActionBtn>
          </span>
        )}
      </div>

      {node.type === 'folder' && node.open && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1}
              tree={tree} setTree={setTree}
              selected={selected} setSelected={setSelected}
              creating={creating} setCreating={setCreating}
            />
          ))}
          {creating && creating.parentId === node.id && (
            <div style={{ paddingLeft: indent + 30, paddingRight: 8, display: 'flex', alignItems: 'center', gap: 3, height: 26 }}>
              {creating.type === 'folder' ? <FolderIcon open={false} /> : <FileIcon name="new" />}
              <InlineInput
                onCommit={(name) => handleCreatingCommit(creating.type, name)}
                onCancel={() => setCreating(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Small buttons ────────────────────────────────────── */
function ActionBtn({ children, onClick, title, danger }) {
  const [h, setH] = useState(false)
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: h ? (danger ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.1)') : 'transparent',
        border: 'none', borderRadius: 3, padding: '2px 3px', cursor: 'pointer',
        color: h ? (danger ? '#f87171' : '#e2e8f0') : '#6b7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}

function PencilIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
}
function TrashIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1.5 3h8M4 3V2h3v1M3 3l.5 6h4L8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function TopBtn({ children, onClick, icon }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: h ? '#3b82f6' : '#2563eb',
        color: '#fff', border: 'none', borderRadius: 6,
        padding: '6px 12px', fontSize: 12.5, fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s',
        fontFamily: '"JetBrains Mono","Fira Code",monospace',
        boxShadow: h ? '0 2px 8px rgba(59,130,246,.4)' : 'none',
      }}
    >
      {icon}{children}
    </button>
  )
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}

/* ─── App ──────────────────────────────────────────────── */
export default function App() {
  // Load from localStorage on first render; falls back to INIT_TREE
  const [tree, setTreeRaw] = useState(loadTree)
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(null)
  const [rootCreating, setRootCreating] = useState(null)

  // Wrap every tree update to also persist it
  function setTree(updater) {
    setTreeRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveTree(next)
      return next
    })
  }

  function commitRootCreate(name) {
    const node = rootCreating === 'file' ? makeFile(name) : makeFolder(name)
    setTree(prev => [...prev, node])
    setRootCreating(null)
  }

  function startCreate(type) {
    const sel = selected ? findNode(tree, selected) : null
    if (sel && sel.type === 'folder') {
      setCreating({ type, parentId: sel.id })
      setTree(mapTree(tree, (n) => n.id === sel.id ? { ...n, open: true } : n))
    } else {
      setCreating(null)
      setRootCreating(type)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { background: #161b27; font-family: "JetBrains Mono","Fira Code",monospace; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 3px; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#161b27', userSelect: 'none' }}>

        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px 9px', background: '#1c2132', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginRight: 8 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#6b7280', letterSpacing: '0.05em' }}>
            File Explorer
          </span>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,.05)', background: '#161b27', flexShrink: 0 }}>
          <TopBtn icon={<PlusIcon />} onClick={() => startCreate('file')}>New File</TopBtn>
          <TopBtn icon={<PlusIcon />} onClick={() => startCreate('folder')}>New Folder</TopBtn>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 6, paddingBottom: 12 }}>
          {tree.map((node) => (
            <TreeNode key={node.id} node={node} depth={0}
              tree={tree} setTree={setTree}
              selected={selected} setSelected={setSelected}
              creating={creating} setCreating={setCreating}
            />
          ))}

          {rootCreating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingLeft: 26, paddingRight: 8, height: 26 }}>
              {rootCreating === 'folder' ? <FolderIcon open={false} /> : <FileIcon name="new" />}
              <InlineInput onCommit={commitRootCreate} onCancel={() => setRootCreating(null)} />
            </div>
          )}

          {tree.length === 0 && !rootCreating && (
            <p style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>
              No files yet. Create one above.
            </p>
          )}
        </div>

        {/* Status bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '5px 14px', display: 'flex', gap: 10, alignItems: 'center', background: '#1c2132', flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }} />
          <span style={{ fontSize: 11, color: '#4b5563', letterSpacing: '0.04em' }}>
            {countNodes(tree).files} files · {countNodes(tree).folders} folders
          </span>
        </div>
      </div>
    </>
  )
}

/* ─── Utils ────────────────────────────────────────────── */
function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.type === 'folder') { const found = findNode(n.children, id); if (found) return found }
  }
  return null
}

function countNodes(nodes) {
  return nodes.reduce((acc, n) => {
    if (n.type === 'file') return { ...acc, files: acc.files + 1 }
    const inner = countNodes(n.children)
    return { files: acc.files + inner.files, folders: acc.folders + 1 + inner.folders }
  }, { files: 0, folders: 0 })
}