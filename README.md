# maxheinze.eu

Personal academic site. Jekyll on GitHub Pages (no Actions or custom plugins needed).
The home page is authored in plain Markdown; a small client-side script
(`assets/js/panels.js`) restructures the rendered Markdown into the horizontal
category / vertical section panel layout.

## How to edit the home page

Edit `index.md`. The rules:

- `#  Heading`  → a **category** (the side-by-side panels: Research, Teaching, …).
- `## Heading`  → a **section box** inside the current category.
- Everything between headings becomes that box's content.

### Category icon
Put a Bootstrap Icons name under the `#` line with a kramdown attribute:

```markdown
# Research
{: data-icon="bi-journal-text"}
```

Icon names: https://icons.getbootstrap.com . If omitted, a default is chosen.

### Buttons
A paragraph that contains **only links** becomes a row of pill buttons. Put the
links on consecutive lines (no blank line between them):

```markdown
[View Paper](https://doi.org/…)
[View Repo](https://github.com/…)
[Slides](/assets/slides.pdf)
```

- The first button is solid (gradient); the rest are light "ghost" pills.
  Override with `{: .solid}` or `{: .ghost}` after a link.
- Icons are added automatically by destination (GitHub, PDF/download, mailto,
  external link). To force one, write it yourself: `[<i class="bi bi-easel"></i> Slides](…)`.
- A blank line between links makes each its own row (stacked).

### Pop-ups
Give a link the `popup` class and point it at a hidden source block by id:

```markdown
[Details](#wip-details){: .popup}

<div class="popup-src" id="wip-details" markdown="1">
### Details
Anything here — text, links, an embed — shows in a scrollable pop-up.
</div>
```

If a box's content is simply too tall, on **desktop** it is clipped with a fade and a
round ⋯ button that opens the full content in the same pop-up — no markup needed.
On **mobile**, tall boxes scroll inside the box instead.

### Desktop-only text
Wrap inline text in `<span class="desktop-only">…</span>` to hide it below 860 px.

## Header buttons
Edit `_data/buttons.yml` (label, href, icon, `solid: true`). They appear on every page.

## Subpages
Course/project pages (e.g. `econometrics-i.md`) use `layout: page` — normal flowing
content with the same header and styling. Add new ones the same way.

