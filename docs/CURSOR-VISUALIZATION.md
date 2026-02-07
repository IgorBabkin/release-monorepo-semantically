# Visualizing Mermaid Diagrams in Cursor

Cursor is based on VS Code, so it supports VS Code extensions. Here are the best ways to visualize Mermaid diagrams in Cursor:

## Recommended Extensions

### Option 1: Markdown Preview Mermaid Support (Recommended)
**Extension ID**: `bierner.markdown-mermaid`

**Installation:**
1. Open Cursor
2. Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux) to open Extensions
3. Search for: `Markdown Preview Mermaid Support`
4. Click "Install" on the extension by **Matt Bierner**

**Usage:**
- Open `docs/uml-diagrams.md`
- Press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux) to open Markdown Preview
- Mermaid diagrams will render automatically in the preview pane
- You can also right-click the file → "Open Preview" or "Open Preview to the Side"

### Option 2: Mermaid Preview
**Extension ID**: `vstirbu.vscode-mermaid-preview`

**Installation:**
1. Search for: `Mermaid Preview`
2. Install the extension by **vstirbu**

**Usage:**
- Right-click on a `.md` file with Mermaid diagrams
- Select "Mermaid: Preview" from the context menu
- Or use the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type "Mermaid: Preview"

### Option 3: Mermaid Editor
**Extension ID**: `tomoyukim.vscode-mermaid-editor`

**Installation:**
1. Search for: `Mermaid Editor`
2. Install the extension by **Tomoyuki Aota**

**Usage:**
- Provides a dedicated Mermaid editor with live preview
- Good for editing Mermaid diagrams directly

## Quick Setup Steps

1. **Install Extension:**
   ```bash
   # In Cursor, open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
   # Type: "Extensions: Install Extensions"
   # Search: "Markdown Preview Mermaid Support"
   # Click Install
   ```

2. **Open Your Diagrams:**
   - Navigate to `docs/uml-diagrams.md`
   - Press `Cmd+Shift+V` (or `Ctrl+Shift+V`) to open preview
   - Diagrams will render automatically!

3. **Side-by-Side View:**
   - Press `Cmd+K V` (Mac) or `Ctrl+K V` (Windows/Linux) to open preview to the side
   - Edit the markdown on the left, see rendered diagrams on the right

## Alternative: Online Viewers

If you prefer not to install extensions:

1. **Mermaid Live Editor**: https://mermaid.live/
   - Copy/paste Mermaid code blocks
   - See instant preview
   - Export as PNG/SVG

2. **GitHub Preview**: 
   - Push your changes to GitHub
   - View `docs/uml-diagrams.md` on GitHub
   - Mermaid renders natively on GitHub

## Keyboard Shortcuts Reference

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open Extensions | `Cmd+Shift+X` | `Ctrl+Shift+X` |
| Open Markdown Preview | `Cmd+Shift+V` | `Ctrl+Shift+V` |
| Open Preview to Side | `Cmd+K V` | `Ctrl+K V` |
| Command Palette | `Cmd+Shift+P` | `Ctrl+Shift+P` |

## Troubleshooting

**Diagrams not rendering?**
- Make sure the extension is installed and enabled
- Check that your Mermaid syntax is correct (use Mermaid Live Editor to validate)
- Try reloading the window: `Cmd+Shift+P` → "Developer: Reload Window"

**Preview not updating?**
- Save the file (`Cmd+S` / `Ctrl+S`)
- The preview should auto-refresh

**Want to export diagrams?**
- Use Mermaid Live Editor (mermaid.live) to export as PNG/SVG
- Or use the Mermaid CLI: `npm install -g @mermaid-js/mermaid-cli && mmdc -i uml-diagrams.md -o output.png`

## Recommended Workflow

1. **Install** "Markdown Preview Mermaid Support" extension
2. **Open** `docs/uml-diagrams.md` in Cursor
3. **Press** `Cmd+K V` to open preview side-by-side
4. **Edit** diagrams and see live updates
5. **Commit** to GitHub for team viewing (renders automatically)

Enjoy visualizing your UML diagrams! 🎨
