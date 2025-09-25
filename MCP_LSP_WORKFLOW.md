# MCP Language Server Workflow for Safe Refactoring

This document outlines how to use MCP Language Servers effectively to prevent broken references and dependencies during refactoring.

## Available MCP Servers

Your project has these MCP servers configured in `.claude-mcp-config.json`:
- **CSS LSP**: Analyzes CSS files and their dependencies
- **HTML LSP**: Tracks HTML structure and imports
- **TypeScript LSP**: Maps JavaScript/TypeScript module dependencies
- **Puppeteer Screenshots**: Visual regression testing

## Safe Refactoring Workflow

### 🚨 BEFORE Deleting or Moving Any File

#### 1. Find All References First
```bash
# Use Grep tool to find all references
grep -r "filename.css" /path/to/project/
grep -r "import.*filename" /path/to/project/

# For CSS files specifically
grep -r "main.css" creator/
grep -r "bundle.css" creator/
```

#### 2. Use MCP LSP Tools
- **CSS LSP**: Should provide "Find References" functionality
- **HTML LSP**: Can track `<link>` and `<style>` references
- **TypeScript LSP**: Maps import/export dependencies

#### 3. Create Reference Map
Document what depends on what:
```
main.css → used by:
  - creator/index.html
  - creator/test-refactor.html
  - creator/slides.html
```

### ✅ SAFE Refactoring Process

#### Step 1: Update References FIRST
- Modify all importing files to use new structure
- Test each file individually after update
- Never delete before updating references

#### Step 2: Verify Changes
```bash
# Visual verification
npm run screenshot-all

# Reference verification
grep -r "old-filename" creator/ # Should return nothing
```

#### Step 3: Delete Only After Verification
- All references updated ✅
- All pages tested ✅
- Screenshots confirm no visual regressions ✅
- THEN delete old files

### 🔧 Tools for Dependency Analysis

#### Manual Tools (Always Available)
```bash
# Find all CSS imports
grep -r "\.css" creator/ --include="*.html"

# Find all JavaScript imports
grep -r "import\|require" creator/ --include="*.js"

# Find specific file references
grep -r "main.css" creator/
```

#### MCP LSP Commands (When Working)
- "Go to References" - Find all uses of a symbol
- "Rename Symbol" - Safe rename across files
- "Find All References" - Before deletion
- "Refactor > Move File" - Handles reference updates

### 📊 Prevention Checklist

Before any file deletion:
- [ ] Used `grep` or LSP to find ALL references
- [ ] Updated all importing files first
- [ ] Tested each updated file individually
- [ ] Ran visual regression tests (screenshots)
- [ ] Verified no broken references remain
- [ ] THEN deleted the old file

### 🎯 Lessons from main.css Incident

**What Went Wrong:**
- Deleted `main.css` without checking references
- Missed `creator/index.html` and `test-refactor.html` imports
- No dependency analysis before deletion
- Focused on technical changes, not impact analysis

**How MCP LSPs Would Have Helped:**
- CSS LSP would show all files importing `main.css`
- HTML LSP would track `<link>` references
- "Find References" would reveal forgotten files
- Safe rename operations would update all references

### 🚀 Best Practices

1. **Always Use LSP Tools**: They're there for exactly this purpose
2. **Reference-First Refactoring**: Update imports before deleting files
3. **Incremental Testing**: Test after each change, not at the end
4. **Visual Verification**: Screenshots prevent style regressions
5. **Dependency Mapping**: Know what depends on what before changing it

## Future Improvements

- Set up automated reference checking in pre-commit hooks
- Create scripts that verify all CSS/JS imports are valid
- Use LSP "Find All References" more proactively
- Implement automated visual regression testing

---

*Remember: The tools are only as good as our discipline in using them!*