# Options for detecting doc drift

Research for [#35](https://github.com/yo61/agent-team-topologies/issues/35), under map
[#24](https://github.com/yo61/agent-team-topologies/issues/24). Facts only; choosing an option is
[#36](https://github.com/yo61/agent-team-topologies/issues/36).

Researched 2026-10-09. Versions are the latest stable releases on that date.

Two kinds of drift:

- **Link drift**: an external URL in the repo is broken or now redirects.
- **Claim drift**: a repo statement about Claude Code behaviour disagrees with
  `code.claude.com/docs`.

## What code.claude.com publishes

Probed directly with `curl` on 2026-10-09.

| Endpoint | Status | Notes |
| --- | --- | --- |
| `/docs/llms.txt` | 200, 61 KB | Index: one line per page, each with a `.md` URL and a one-line description (267 lines). |
| `/docs/llms-full.txt` | 200, 9.3 MB | Every page concatenated. |
| `/docs/en/<page>.md` | 200, `text/markdown` | Raw Markdown for any page, e.g. `agent-teams.md` (40 KB). Two fetches gave the same SHA-1, so the content is stable byte for byte between fetches. |
| `/docs/en/changelog` and `/docs/en/changelog.md` | 200 | CLI release notes by version. |
| `/docs/en/changelog/rss.xml` | 200, `application/rss+xml` | Mintlify-generated RSS feed, one item per CLI release (15 items). Latest item was 2.1.296, 2026-10-09. |
| `/docs/en/whats-new/rss.xml` | 200, `application/rss+xml` | Weekly digest feed. The digest index ran to Week 37 (7-11 September) on 2026-10-09, so it lags the changelog. |
| `/docs/rss.xml`, `/docs/en/rss.xml` | 404 | No site-wide feed of page edits. |
| `/docs/sitemap.xml` | 200, 2,629 URLs | Every URL has a `<lastmod>`. For `en` pages the values range from 2026-07-29 to 2026-10-09, so they differ per page. Not verified whether `lastmod` tracks content edits or deploys. |

- Per-page response headers: `cache-control: public, max-age=0, must-revalidate` and a
  `last-modified` equal to the fetch time. No `ETag`.
- Each `.md` page starts with a blockquote pointing to `llms.txt`.
- The [llms.txt proposal](https://llmstxt.org/) defines no change tracking, versioning or
  timestamps. Hashing `llms.txt` catches pages that are added, removed or re-described, but not
  edits to page bodies.
- The same release notes are in
  [`anthropics/claude-code/CHANGELOG.md`](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
  (last commit 2026-10-09T19:28Z). Watching its commits gives the same signal as the RSS feed.
- A search of the `anthropics` org found no public source repository for the docs, so there is
  no commit history of doc edits to watch.
- **No source records edits to doc pages.** The changelog and the weekly digest record changes
  to the product. A behaviour change usually shows up there, but a doc that is reworded or
  corrected without a release does not.
- Old links: `docs.anthropic.com/en/docs/claude-code/hooks` returns `301` to
  `code.claude.com/docs/en/hooks`.

## Link drift

### Repo baseline

lychee 0.24.2 run locally (`lycheeverse/lychee:0.24.2` image) over the worktree, excluding
`.claude/`:

- **Default settings** (follows up to 10 redirects): 152 links, 49 unique, done in 537 ms.
  3 errors. 5 redirects were followed and only mentioned in a hint, so they did not fail the run.
- **`--max-redirects 0`**: 8 errors.
  - `docs.anthropic.com/en/docs/claude-code/{agent-teams,overview}` → `301`. This is the drift
    the audit found.
  - `github.com/yo61/agent-team-topologies/issues/new` → `302`. This is GitHub sending a logged-out
    client to sign in. It is a false positive.
  - `CHANGELOG.md` link `compare/v1.0.0...v1.1.0` → `404`. The repo has tags `v0.1.0` and `v1.1.0`
    but no `v1.0.0`.
  - `CONTRIBUTING.md` links `../../issues/new?template=...` were reported as file not found. That
    relative-path trick resolves when GitHub renders the file, but not on a built site or as a file
    path.
- **YAML is not checked by default.** lychee's default extensions are
  `md,markdown,mdx,qmd,rmd,mkd,mkdn,mdwn,mdown,mkdown,html,htm,css,txt,xml`. Running it on
  `.pre-commit-config.yaml` directly reported the moved zizmor hook
  (`woodruffw/zizmor-pre-commit` → `301`). A directory scan does not pick that file up unless YAML
  is passed explicitly.
- Liquid links (`{{ site.baseurl }}/...` in `404.md`) produced no errors.

### lychee + lychee-action

- **Versions**: lychee
  [`lychee-v0.24.2`](https://github.com/lycheeverse/lychee/releases/tag/lychee-v0.24.2)
  (2026-05-01).
  [`lycheeverse/lychee-action` v2.9.0](https://github.com/lycheeverse/lychee-action/releases/tag/v2.9.0)
  (2026-07-09) is commit `e7477775783ea5526144ba13e8db5eec57747ce8` and installs lychee v0.24.2 by
  default.
- **What it checks**: source files directly (Markdown, HTML and the rest of the list above) and
  needs no Jekyll build. Remote URLs, local files (`--root-dir`, `--base-url`), and fragments
  (`--include-fragments`).
- **Redirects** ([README options](https://github.com/lycheeverse/lychee#commandline-parameters)):
  - `-m/--max-redirects` defaults to 10. `--accept` defaults to `100..=103,200..=299`.
  - Only the final status code counts, so a redirect that ends in 200 passes.
  - To fail on redirects, set `--max-redirects 0`. The `3xx` is then outside `--accept` and is
    rejected. This works, but the output does not show where the link now points.
  - A dedicated reject-redirects or suggest-redirects flag is proposed in
    [lychee#2013](https://github.com/lycheeverse/lychee/issues/2013) (open). Auto-fixing redirects
    is [lychee#2044](https://github.com/lycheeverse/lychee/issues/2044) (open).
  - In the meantime, the maintainer suggests parsing `-f json` output (`.redirects`) and failing on
    a non-zero count. `-v` prints each redirect chain.
- **Setup cost**: one workflow job.
  - Action inputs: `args`, `fail` (default true), `failIfEmpty` (default true), `format` (default
    `markdown`), `output` (default `lychee/out.md`), `jobSummary` (default true), `token` (default
    `github.token`, used to reduce GitHub rate limiting), `lycheeVersion`, `checkbox`,
    `workingDirectory`, `debug`.
  - Pre-commit hooks exist upstream (`.pre-commit-hooks.yaml`: `lychee`, `lychee-system`,
    `lychee-docker`), so prek could run it too.
- **Run cost**: under a second for this repo (measured above). Actions minutes are free for public
  repos on standard GitHub-hosted runners
  ([GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).
  An optional `.lycheecache` restored through `actions/cache` (README recipe) cuts repeat requests.
- **False positives**:
  - Login redirects such as GitHub `issues/new`. These need `--exclude` or a per-host `--accept`.
  - Rate limiting (`429`) from GitHub and other hosts. `--accept` can list it and `--cache-exclude-status` keeps it out of the cache.
  - Network flakes (`--max-retries`, default 3).
  - Links that only work in GitHub's renderer, such as `../../issues/new`.
- **Output**, all three possible:
  - A failing check: the job fails when `fail: true`.
  - A job summary in Markdown.
  - An issue: the action README's recipe pairs a daily `schedule` with
    `peter-evans/create-issue-from-file` and needs `issues: write`.
  - A PR comment needs a third-party comment action. The action does not post one itself.

### html-proofer

- **Version**:
  [`html-proofer` v5.2.2](https://github.com/gjtorikian/html-proofer/releases/tag/v5.2.2)
  (2026-07-28). Needs Ruby `>= 3.1, < 5.0` (gemspec). Uses Typhoeus (libcurl) for external
  requests.
- **What it checks**: built HTML only. It needs `jekyll build` first, and with `baseurl:
  /agent-team-topologies` it needs `swap_urls` (the README's Jekyll recipe). It checks links,
  images and scripts (default `checks`), internal and external anchors, and `enforce_https`
  (default true).
- **Redirects**: `TYPHOEUS_DEFAULTS` sets `followlocation: true`
  ([configuration.rb](https://github.com/gjtorikian/html-proofer/blob/v5.2.2/lib/html_proofer/configuration.rb)).
  The external validator passes only 2xx and reports any other code as a failure unless
  `only_4xx` is set or the code is in `ignore_status_codes`. Passing
  `--typhoeus '{"followlocation": false}'` therefore makes a 3xx fail. This is inferred from the
  source and was not run here. No dedicated redirect option exists.
- **Setup cost**: higher than lychee for this repo.
  - The site uses the legacy GitHub Pages branch build, so CI does not build it today. html-proofer
    needs a Ruby setup step, a `bundle install` of the Gemfile (with `remote_theme`
    `just-the-docs@v0.12.0`), and `jekyll build` before it can run.
  - There is no first-party GitHub Action.
- **Run cost**: build time plus checking. Not measured, because html-proofer was not installed.
  It has an external-link cache (`cache: { timeframe: { external: "30d" } }`). Failed links are
  always rechecked.
- **False positives**: the same network classes as lychee. Plus anything the build rewrites, which
  `swap_urls` has to map. It sees only what Jekyll publishes, so it never sees files outside the
  site such as `.pre-commit-config.yaml` or the excluded `README.md`, `CLAUDE.md` and
  `decisions/`.
- **Output**: the process exits non-zero, which fails the check. A text report goes to the log.
  There is no built-in issue or comment output.

## Claim drift

None of these is a turnkey tool. Each is a pattern built from the endpoints above.

### A. Watch for change signals (no LLM)

A scheduled workflow polls a signal and opens or updates an issue when it moves. Possible signals:

- the changelog RSS feed or the `anthropics/claude-code` `CHANGELOG.md`
- a hash of `llms.txt`
- hashes of the `.md` pages the repo cites
- the sitemap `lastmod` of those pages

Details:

- **Setup cost**: a small workflow running `curl` and `sha256sum`. The previous hash or the last
  seen release is stored in the repo, in an issue body, or in an Actions cache.
- **Run cost**: seconds. Free minutes on a public repo.
- **False positives**: all of them, by design. It reports that something changed, not that a
  claim is wrong.
  - The changelog moves almost every day (2.1.296 shipped on 2026-10-09). Most entries do not
    touch topics the repo covers.
  - Page hashes change on any edit, including typo fixes.
  - The sitemap had 59 `en` pages with a 2026-10-09 `lastmod`.
- **Misses**: anything the watched signal does not cover. Doc rewordings that come with no
  release are missed by changelog watching.
- **Output**: an issue, made by the workflow with `gh issue create` or a create-issue action.

### B. Claim fixtures: pinned quotes asserted against the live docs (no LLM)

Each repo claim is paired with a short quote from the official page that supports it, stored as
data (claim, page `.md` URL, expected substring). A scheduled job fetches each page and fails if a
quote is gone.

- **Setup cost**: someone writes the fixture list, one entry per claim. The 2026-10-09 audit on #24
  lists about 20 checked claims. The job itself is small.
- **Run cost**: seconds. The six pages the audit used total 621 KB.
- **False positives**: rewording upstream breaks a quote even when the meaning is unchanged.
- **Misses**:
  - New behaviour the repo never claimed, such as the "not covered by the repo" items in the audit.
  - Claims nobody wrote a fixture for.
  - A quote that survives while the surrounding text changes its meaning.
- **Output**: a failing check, or an issue if the schedule job opens one.

### C. Scheduled claude-code-action job (LLM)

- **Version**:
  [`anthropics/claude-code-action` v1.0.248](https://github.com/anthropics/claude-code-action/releases/tag/v1.0.248)
  (2026-10-09) is commit `1d6de8cb0c237e7c15e9e1bdf973826ebae490cc`. The floating `v1` tag also
  exists.
- **How**: "automation mode". Setting the `prompt` input makes it run right away with no tracking
  comment ([custom-automations.md](https://github.com/anthropics/claude-code-action/blob/v1.0.248/docs/custom-automations.md)).
  - The [solutions guide](https://github.com/anthropics/claude-code-action/blob/v1.0.248/docs/solutions.md#scheduled-repository-maintenance)
    has a "Scheduled Repository Maintenance" recipe: `schedule` plus `workflow_dispatch`, and
    "Create a single issue summarizing any findings".
  - `claude_args` passes CLI flags (e.g. `--allowedTools`, `--json-schema`). The
    `structured_output` output returns JSON matching the schema, so a later step can decide pass or
    fail deterministically.
  - The prompt can tell Claude to `curl` the `.md` pages. The docs say WebFetch is "lossy by
    design": a separate model call extracts from the page, and Claude gets the extract, not the page
    ([tools-reference](https://code.claude.com/docs/en/tools-reference#webfetch-tool-behavior)).
- **Setup cost**:
  - One workflow.
  - A secret: `ANTHROPIC_API_KEY` (API billing) or `CLAUDE_CODE_OAUTH_TOKEN` (subscription, made
    with `claude setup-token`), or OIDC workload identity federation.
  - Permissions `contents`, `issues`/`pull-requests` and `id-token: write`
    ([github-actions docs](https://code.claude.com/docs/en/github-actions)).
  - Scheduled events skip the write-access check because no user triggered them.
  - The prompt has to say which pages to compare against which repo files.
- **Run cost**:
  - Actions minutes are free on a public repo.
  - Model tokens: comparing against the six pages the audit used means reading about 621 KB of
    docs (about 155k tokens at roughly 4 characters per token, an estimate) plus about 125 KB of
    repo prose (about 31k tokens), before reasoning and output. That is per run.
  - API key runs are billed per token. OAuth runs draw on the Claude subscription.
- **Scheduling caveats**
  ([GitHub docs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)):
  - Schedules run on the default branch only.
  - They can be delayed at high load, for example at the top of the hour.
  - In a public repo they are disabled automatically after 60 days without repository activity.
- **False positives**: model judgement errors in both directions, and different results from run
  to run. Raw Markdown via `curl` keeps the full page text in context. WebFetch summaries can
  leave out what the prompt didn't ask about. A JSON schema plus a requirement to quote the doc
  sentence makes each finding checkable.
- **Output**: whatever the prompt and permissions allow. An issue (the recipe's default), a PR with
  fixes on a `claude/` branch (`branch_prefix`), a comment, or a failing check (`conclusion`
  output, or a step that reads `structured_output`).

### D. Scheduled Claude Code routine (LLM)

- **What**: a saved prompt plus repositories plus connectors, run on Anthropic-managed cloud
  infrastructure ([routines docs](https://code.claude.com/docs/en/routines)).
  - Research preview: "Behavior, limits, and the API surface may change."
  - Created at claude.ai/code/routines or with `/schedule` in the CLI.
  - The docs list "Docs drift" as an example use case: a weekly routine that flags stale docs and
    opens update PRs.
- **Setup cost**:
  - No workflow file and no repo secret.
  - Needs a Pro, Max, Team or Enterprise plan, GitHub access for cloning, and the Claude GitHub App
    if GitHub event triggers are used.
  - The default **Trusted** network allowlist already includes `code.claude.com` and `github.com`
    ([cloud-environments](https://code.claude.com/docs/en/cloud-environments#default-allowed-domains)).
  - The routine belongs to one person's claude.ai account and is not shared with teammates. Its
    config lives in that account, not in the repo.
- **Run cost**:
  - Draws on subscription usage like an interactive session. Overage needs usage credits.
  - Hourly caps: 100 scheduled runs per account. These do not matter for a weekly job.
  - Minimum schedule interval is one hour. Presets are hourly, daily, weekdays and weekly. Custom
    cron is set with `/schedule update`.
- **False positives**: the same LLM-judgement profile as C.
  - A green run status "does not mean the task in your prompt succeeded". It only means the session
    exited without an infrastructure error, so someone has to read the transcript or the routine
    has to produce an artifact.
  - Runs work autonomously with no permission prompts and act as the account owner.
- **Output**: whatever the session does as the owner's GitHub identity, such as an issue, a PR from
  a `claude/`-prefixed branch, or a comment. It cannot fail a CI check unless it opens a PR that
  CI then checks.

## Comparison

| Option | Drift | Setup cost | Run cost | False-positive profile | Output |
| --- | --- | --- | --- | --- | --- |
| lychee + lychee-action | Links | One job; `--max-redirects 0` for redirects | Under 1 s here; free minutes | Login redirects, 429s, renderer-only relative links | Failing check, job summary, issue (with create-issue action) |
| html-proofer | Links (built site) | Ruby, Jekyll build in CI, `swap_urls` | Build plus check; not measured | Same network classes; misses unpublished files | Failing check (exit code) |
| A. Change-signal watch | Claims (indirect) | Small `curl`/hash workflow plus stored state | Seconds | Every change, relevant or not | Issue |
| B. Claim fixtures | Claims (known) | Someone writes one fixture per claim | Seconds | Upstream rewording; misses unclaimed behaviour | Failing check or issue |
| C. claude-code-action on schedule | Claims (semantic) | Workflow, API key or OAuth secret, prompt | About 186k input tokens per full pass (estimate) | Model error, varies between runs | Issue, PR, comment or failing check |
| D. Claude Code routine | Claims (semantic) | Account-owned config, no repo files; research preview | Subscription usage | Model error; green run does not mean task succeeded | Issue, PR or comment as the owner |

## Open points

- Whether sitemap `lastmod` tracks content edits or deploys was not verified. Settling it needs
  a page watched across a known deploy.
- html-proofer redirect failure with `followlocation: false` comes from reading the source, not
  from running it.
- Token figures are size-based estimates, not measured runs.
