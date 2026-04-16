# Monorepo Assumptions

- root `package.json` declares workspaces
- each package has a unique `name`
- internal dependencies are expressed in package manifests
- affected-package calculations rely on git history plus workspace graph
