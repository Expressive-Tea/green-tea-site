# Green Tea Site 26.8.0-beta.0 Release Design

## Goal

Publish an accurate release story for Green Tea `26.8.0-beta.0` and make the
site artifact impossible to tag with a version that disagrees with
`package.json`.

## Release flow

Development happens on `feature/26.8.0-beta.0-release` in Gitea. A pull request
merges the branch into Gitea `main`; the existing promotion workflow mirrors
that commit to GitHub. Only after promotion is complete is
`v26.8.0-beta.0` created on GitHub. The GitHub tag builds and attaches
`green-tea-site-v26.8.0-beta.0.tar.gz` to the release.

No tag is created in Gitea and no `develop` branch is introduced for this site.

## Content

The release post will explain the safe constrained-route subset, deterministic
route precedence, strict path validation, HEAD and OPTIONS semantics, OpenAPI
projection, runtime parity, and dependency remediation. It will explicitly say
that route matching remains a linear scan and that a radix tree is future work.

Landing-page corrections stay narrow: name the four validated targets instead
of claiming every JavaScript runtime, distinguish zero validation-library
dependencies from the single runtime dependency, and qualify transport security
features that differ by runtime.

## Release integrity and security

A dependency-free Node script will compare the GitHub tag to
`v${package.json.version}`. Unit tests cover a matching tag, a mismatched version,
and malformed/missing tags. The GitHub release workflow will run this guard
before packaging.

Astro and MDX will receive compatible updates that pull patched PostCSS, SVGO,
and XML-parser transitives. Gitea/GitHub CI and the GitHub release will run
`npm audit --audit-level=moderate` after `npm ci`.

## Validation

The release branch must pass the tag-guard tests, a clean npm audit, the Astro
build, generated SEO/deploy checks, workflow syntax inspection, and a final
review of all changed claims against the core `26.8.0-beta.0` changelog and docs.
