workflow "New workflow" {
  on = "push"
  resolves = [
    "unit-core",
    "Create an issue",
  ]
}

action "GitHub Action for npm" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  args = "install"
}

action "build-all" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  needs = ["GitHub Action for npm"]
  args = "run build-all"
}

action "unit-core" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  needs = ["build-all"]
  args = "run unit-core"
}

action "lint" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  needs = ["build-all"]
  args = "run lint"
}

action "Create an issue" {
  uses = "JasonEtco/create-an-issue@4ec015aad67f1e9c2f8b6658e1628a2d703b85cb"
  needs = ["lint", "unit-core"]
}
