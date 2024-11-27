import bibtexparser
import json
import matplotlib.pyplot as plt
import numpy as np
from bibtexparser.bparser import BibTexParser
from copy import deepcopy
import re
import unicodedata
import random
import requests


def generate_random_color():
    """Generate a random HTML color code."""
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

def replace_chars(yolo):
    # Define a list of replacement pairs for common LaTeX-style characters
    replacements = [
        ("{\\\"u}", "ü"),
        ("{\\\"a}", "ä"),
        ("{\\\"e}", "ë"),
        ("{\\\"o}", "ö"),
        ("{\\c{c}}", "ç"),
        ("{\\'e}", "é"),
        ("{\\`e}", "è"),
        ("{\\^e}", "ê"),
        ("{\\'a}", "á"),
        ("{\\'c}", "ć"),
        ("{\\`a}", "à"),
        ("{\\^o}", "ô"),
        # Add more replacements as needed
    ]


    # Perform each replacement sequentially
    for latex, replacement in replacements:
        yolo = yolo.replace(latex, replacement)

    return yolo


def get_scholar(quer):
    return '{{< scholar_search query="' + quer + '" >}}'

def divmoi(en, cssclass):
    return f'<div class="{cssclass}" >\n  <p>{en}</p>\n</div>'

def divmoi_v2(en, book, cssclass, where = True):
    div1 = f'<div><p>{en}</p></div>'
    div2 = f'<div style="font-size: 3rem;"><p>{book}</p></div>'
    return f'<div class="{cssclass}" >\n {div1 if where else div2} \n {div2 if where else div1} \n</div>'

def custom_entry_parser(entry):
    # Only set a default ENTRYTYPE if it's missing or non-standard
    if entry.get('ENTRYTYPE') not in ['conf', 'software', 'com']:
        entry['ENTRYTYPE'] = entry.get('ENTRYTYPE', 'custom')
    return entry

header =f'''---
title: "📜 Publications"
description: "List of ym publications"

# If you want to exclude from the menu, set the following to false
menu: 
  main:
    weight: 2
    identifier: "publications"
---

<div class="elegant-header">
  💻📜🎤🌲 Publications Record 
</div>

<div class="main-paragraph">
    <p>Welcome to my publication record, organized chronologically for easy reference.</p>
    <p>Many of these works are open-access. If you need assistance locating a specific paper, don’t hesitate to reach out to me at <a href="mailto:boris.gailleton@univ-rennes.fr">boris.gailleton@univ-rennes.fr</a>.</p>
    <p>Each journal entry includes a 📖 link to the full text.</p>
</div>



'''

code2title = {
    'article': 'Journal Papers',
    'software': 'Research Softwares',
    'conf': 'Conference Abstracts',
    'com': 'Other Communications',
}

DEBUG_PRINT_ONCE = True

unique_tid = []

def format_harvard(entry):
    """Format a single BibTeX entry in Harvard style."""
    global DEBUG_PRINT_ONCE
    if(DEBUG_PRINT_ONCE):
        print(entry.keys())
        DEBUG_PRINT_ONCE = False
    doi = entry.get('doi', "")

    if(doi != '' and False):

        url = f"https://opencitations.net/index/coci/api/v1/citations/{doi}"

        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            print(f"Citations for DOI {doi}: {len(data)}")

    authors = entry.get("author", "No Author") #.replace("{\'a}",'a').replace('{\"a}','a').replace('{\"u}','u')
    authors = replace_chars(authors).replace(',', '').replace(" and ", ", ")


    title = entry.get("title", "No Title")
    journal = entry.get("journal", 'Unknown Journal')
    year = entry.get("year", "")
    volume = entry.get("volume", "")
    number = entry.get("number", "")
    pages = entry.get("pages", "")

    tid = entry.get("ENTRYTYPE",'article').lower()

    meta = {'title': title}

    if(tid not in unique_tid):
        unique_tid.append(tid)

    authors = authors.replace('Gailleton Boris','<b>Gailleton Boris</b>')
    
    # Format as Harvard-style citation
    harvard_citation = f"{authors} ({year}). <i>{title}</i>. {journal if journal != 'Unknown Journal' else ''}, {volume}({number}), pp.{pages}."
    harvard_citation = harvard_citation.replace('()','').replace(',,',',').replace(', ,','').replace('pp..', '').replace('.,','.').replace('. ,','.')
    harvard_citation = replace_chars(harvard_citation)

    jcode = tid
    return jcode, harvard_citation, meta

def parse_bibtex_to_markdown(bibtex_file):
    """Convert a BibTeX file to a Markdown list in Harvard style."""

    entries = {
        'article': [],
        'software': [],
        'conf': [],
        'com': [],
        'thesis': [],
    }

    sorter = {
        'article': [],
        'software': [],
        'conf': [],
        'com': [],
        'thesis': [],
    }

    numberdict = {
        'article': 0,
        'software': 0,
        'conf': 0,
        'com': 0,
        'thesis': 0,
    }

    metadict = {
        'article': [],
        'software': [],
        'conf': [],
        'com': [],
        'thesis': [],
    }


    with open(bibtex_file) as bib_file:
        parser = BibTexParser(ignore_nonstandard_types=False)
        # parser.customization = custom_entry_parser  # Override the customization
        bib_database = bibtexparser.load(bib_file, parser=parser)

    for i, entry in enumerate(bib_database.entries):
        jcode, md, meta = format_harvard(entry)
        entries[jcode].append(md)
        sorter[jcode].append(int(entry.get("year", 2020)))
        metadict[jcode].append(meta)
        numberdict[jcode] += 1


    for k in sorter.keys():
        arg = np.argsort(sorter[k])[::-1]
        cop = deepcopy(entries[k])
        entries[k] = [cop[i] for i in arg]
        metadict[k] = [metadict[k][i] for i in arg]


    bis = False
    formatted_md = f'\n{divmoi("📜 Journal Papers:","elegant-header")}'
    for en,met in zip(entries['article'], metadict['article']):
        # formatted_md += '\n\n'+ divmoi(en + f' {get_scholar(met["title"])}', 'discreet-paragraph-a' if bis else 'discreet-paragraph-b')
        formatted_md += '\n\n'+ divmoi_v2(en, f' {get_scholar(met["title"])}', 'discreet-paragraph-article', bis)
        bis = not bis
    formatted_md += f'\n\n{divmoi("💻 Research Softwares:","elegant-header")}'
    for en in entries['software']:
        formatted_md += '\n\n'+ divmoi(en, 'discreet-paragraph-a' if bis else 'discreet-paragraph-b')
        bis = not bis
    formatted_md += f'\n\n{divmoi("🎤 Conference Abstracts:","elegant-header")}'
    for en in entries['conf']:
        formatted_md += '\n\n'+ divmoi(en, 'discreet-paragraph-a' if bis else 'discreet-paragraph-b')
        bis = not bis
    formatted_md += f'\n\n{divmoi("🌲 Other Communications:","elegant-header")}'
    for en in entries['com']:
        formatted_md += '\n\n'+ divmoi(en, 'discreet-paragraph-a' if bis else 'discreet-paragraph-b')
        bis = not bis

    return formatted_md, numberdict

# Example usage
bibtex_file = "proofed.bib"

markdown_output, numberdict = parse_bibtex_to_markdown(bibtex_file)

print(numberdict)

categories = []
values = []

for k,v in code2title.items():
    categories.append(v)
    values.append(numberdict[k])


metrics = {
    "Journal\nArticles": numberdict['article'],
    "Conference\nPapers": numberdict['conf'],
    "Research\nSoftware": numberdict['software'],
}

citations = 387
h_index = 10

# Style settings
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec

# Set font properties globally using rcParams
# plt.style.use("ggplot")
plt.rcParams.update({
    'font.family': 'monospace',      # Sets the font family (e.g., 'serif', 'sans-serif', 'monospace')
    'font.serif': ['Liberation Mono'],  # Specific font for serif family
    'font.size': 12,             # Base font size for labels and text
    'axes.titlesize': 16,        # Font size for axes titles
    'axes.labelsize': 14,        # Font size for x and y labels
    'xtick.labelsize': 12,       # Font size for x-axis tick labels
    'ytick.labelsize': 12,       # Font size for y-axis tick labels
    'legend.fontsize': 12,       # Font size for legend text
    'figure.titlesize': 18,       # Font size for figure titles
    'text.color': '#000000',               # General color for text elements
    'axes.labelcolor': '#111111',          # Color for x and y labels
    'axes.titlecolor': '#222222',          # Color for axes titles
    'xtick.color': '#333333',              # Color for x-axis tick labels
    'ytick.color': '#333333', 
})


# Style settings
fig = plt.figure(figsize=(8, 5))
fig.suptitle("Academic Impact Overview", fontsize=16, weight="bold", style="italic")
fig.patch.set_alpha(0.7)   # Set figure background to transparent

# Use GridSpec to create layout
gs = GridSpec(100, 100)  # Two rows, two columns, first row spans both columns

# 1. Academic Output Bar Plot (spanning both columns in the first row)
ax1 = fig.add_subplot(gs[:, :50])
ax1.bar(metrics.keys(), metrics.values(), color=[generate_random_color() for i in range(3)], width=0.4, edgecolor = 'k', lw = 4)
ax1.set_ylabel("Count", fontsize=12)
ax1.set_ylim(0, max(metrics.values()) + 2)
ax1.set_title("Publications", fontsize=14, weight="bold")
ax1.grid(False)
ax1.tick_params(axis="y", which="both", left=True)
ax1.set_facecolor((0, 0, 0, 0))  # Set axes background to transparent

# 2. Citations Plot (left subplot in the second row)
ax2 = fig.add_subplot(gs[:, 60:75])
ax2.bar([0.5], [citations], color="#4F81BD", edgecolor = 'k', lw = 4, width = 0.25)
ax2.set_xticks([0.5])
ax2.set_xticklabels(["Citations"])
ax2.set_xlim(0,1)
# ax2.set_ylabel("Count", fontsize=12)
ax2.set_ylim(0, citations + 20)
ax2.set_title("Total Citations", fontsize=14, weight="bold")
ax2.grid(False)
ax2.tick_params(axis="y", which="both", left=True)
ax2.set_facecolor((0, 0, 0, 0))  # Set axes background to transparent

# 3. h-Index Plot (right subplot in the second row)
ax3 = fig.add_subplot(gs[:, 85:100])
ax3.bar(0.5, [h_index], facecolor="#C0504D", width=0.25, edgecolor = 'k', lw = 4)
ax3.set_xticks([0.5])
ax3.set_xticklabels(["h-Index"])
ax3.set_xlim(0,1)
# ax3.set_ylabel("h-Index", fontsize=12)
ax3.set_ylim(0, h_index + 5)
ax3.set_title("h-Index", fontsize=14, weight="bold")
ax3.grid(False)
ax3.tick_params(axis="y", which="both", left=True)
ax3.set_facecolor((0, 0, 0, 0))  # Set axes background to transparent

# Adjust layout for readability
# plt.tight_layout(rect=[0, 0.03, 1, 0.95])

# Show or save the plot
plt.savefig('biblio.png')


intro = f'''


<div style="text-align: center;">
    <img src="/images/publications/biblio_recap.png" alt="Publication Record" style="width: 80%; max-width: 600px;">
</div>


Find bellow the extended list of my publications, you can also check [my google scholar profile](https://scholar.google.fr/citations?hl=en&pli=1&user=r5HIc00AAAAJ):

'''


with open("biblio.md", "w+") as file:
    file.write(header)
    file.write(intro)
    file.write(markdown_output)
