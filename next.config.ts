# Reset Git's internal index to clear the "jam" from before
git rm -r --cached .

# Re-add only the essentials (this avoids node_modules automatically)
git add src/ package.json tsconfig.json next.config.ts .gitignore tailwind.config.ts postcss.config.mjs

# Commit and Push
git commit -m "deploy: consolidated source and config"
git push -u origin main