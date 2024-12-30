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
import bibtexparser
from collections import defaultdict



# TODO: RE-add the corrections fro the special characters
# Add preprints for more citations and less holes in CV
# My name in bold
# Add Softwares and conf and others

def get_scholar(quer):
    return "<div style='font-size: 2rem;'><p>" + '{{< scholar_search query="' + quer + '" >}}'+"</p></div>"

def correct_char(yolo):
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
		("{",""),
		("}","")
		# Add more replacements as needed
	]


	# Perform each replacement sequentially
	for latex, replacement in replacements:
		yolo = yolo.replace(latex, replacement)

	return yolo

def generate_random_color():
	"""Generate a random HTML color code."""
	return "#{:06x}".format(random.randint(0, 0xFFFFFF))

header =f'''---
title: "📜 Publications"
description: "List of my publications"

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
    <p>Each journal entry includes a 📖 link to paper and a 🎓 link to google scholar.</p>
</div>



'''

def parse_bibtex(file_path, etype = 'paper', citations = True):
	"""Reads a BibTeX file and returns sorted entries."""
	with open(file_path, 'r') as bibtex_file:
		bib_database = bibtexparser.load(bibtex_file)
	
	# Extract relevant fields
	entries = []
	for entry in bib_database.entries:
		year = int(entry.get('year', 0))
		authors = entry.get('author', 'Unknown').replace(' and ', ', ')
		title = entry.get('title', 'No Title')
		journal = entry.get('journal', 'No Journal')
		booktitle = entry.get('booktitle', 'conf')
		doi = entry.get('doi', '')
		citations = extract_citations(entry.get('annotation', '')) if citations else 0
		
		entries.append({
			'year': year,
			'authors': correct_char(authors),
			'title': correct_char(title),
			'journal': correct_char(journal),
			'booktitle': correct_char(booktitle),
			'doi': correct_char(doi),
			'citations': citations,
			'type': etype,
		})

	# Sort by year in descending order
	entries.sort(key=lambda x: x['year'], reverse=True)
	return entries

def parse_bibtexes(file_dict):
	"""Reads a dict of BibTeX files where key is type and returns sorted entries."""
	
	
	# Extract relevant fields
	entries = []
	for etype,tfile in file_dict.items():
		with open(tfile, 'r') as bibtex_file:
			bib_database = bibtexparser.load(bibtex_file)

		for entry in bib_database.entries:
			year = int(entry.get('year', 0))
			authors = entry.get('author', 'Unknown').replace(' and ', ', ')
			title = entry.get('title', 'No Title')
			journal = entry.get('journal', 'No Journal')
			doi = entry.get('doi', '')
			citations = extract_citations(entry.get('annotation', ''))
			
			entries.append({
				'year': year,
				'authors': correct_char(authors),
				'title': correct_char(title),
				'journal': correct_char(journal),
				'doi': correct_char(doi),
				'citations': citations,
				'type': etype,
			})

	# Sort by year in descending order
	entries.sort(key=lambda x: x['year'], reverse=True)
	return entries

def extract_citations(annotation):
	"""Extracts the number of citations from the annotation field."""
	try:
		for line in annotation.split('\\n'):
			if 'citations' in line:
				return int(line.split()[0])
	except Exception:
		pass
	return 0

def generate_markdown(entries):
	"""Generates a Markdown-compatible bibliography grouped by year."""
	grouped_entries = defaultdict(list)
	for entry in entries:
		grouped_entries[entry['year']].append(entry)

	markdown = []
	for year in sorted(grouped_entries.keys(), reverse=True):
		markdown.append(f"## {year}\n")
		for entry in grouped_entries[year]:
			doi_link = f":book: [DOI](https://doi.org/{entry['doi']})" if entry['doi'] else ""
			markdown.append(
				f"- **{entry['authors']}**. \"{entry['title']}\". *{entry['journal']}*, {year}. {doi_link} ({entry['citations']} citations)\n"
			)
	return '\n'.join(markdown)

def generate_html_papers(entries):
	"""Generates an HTML-compatible bibliography grouped by year."""
	grouped_entries = defaultdict(list)
	for entry in entries:
		grouped_entries[entry['year']].append(entry)

	html = ["<h1>Papers</h1>","<div>\n"]

	for year in sorted(grouped_entries.keys(), reverse=True):

		html.append(f"<h3>{year}</h3>\n")
		
		html.append("<ul>\n")

		left = True
		for entry in grouped_entries[year]:
	
			if(entry['type'] not in ['paper', 'preprint']):
				continue

			doi_link = f"<div style='font-size: 2rem;'> <p><a href='https://doi.org/{entry['doi']}' target='_blank'>📖</a></p> </div>" if entry['doi'] else ""
			doi_link += get_scholar(entry['title'])
			# doi_link = f"<div style='font-size: 3rem;'><a href='https://doi.org/{entry['doi']}' target='_blank'>📖</a></div> <div style='font-size: 3rem;'>{{< scholar_search query='Inferring Long-Term Tectonic Uplift Patterns from Bayesian Inversion of Fluvially-Incised Landscapes' >}}</div>" if entry['doi'] else ""

			citation_text = '(P)' if entry['type'] == 'preprint' else ''

			citation_text += f"<li><strong>{entry['authors']}</strong>. {entry['title']}. <em>{entry['journal']}</em>, {year}. ({entry['citations']} citations)</li>"

			html.append("<div class=%s>\n"%("discreet-paragraph-article"))
			if(left):
				html.append(doi_link+'\n')
				html.append(citation_text+'\n')
			else:
				html.append(citation_text+'\n')
				html.append(doi_link+'\n')
			left = not left
			html.append("</div>\n")

		html.append("</ul>"+'\n')

	html.append("</div>"+'\n')

	return '\n'.join(html)

def generate_html_conf(entries):
	"""Generates an HTML-compatible bibliography grouped by year."""
	grouped_entries = defaultdict(list)
	for entry in entries:
		grouped_entries[entry['year']].append(entry)

	html = ["<h1>Conferences</h1>","<div>\n"]

	for year in sorted(grouped_entries.keys(), reverse=True):

		html.append(f"<h3>{year}</h3>\n")
		
		html.append("<ul>\n")

		for entry in grouped_entries[year]:

			
			citation_text = f"<li><strong>{entry['authors']}</strong>. {entry['title']}. <em>{entry['booktitle']}</em>, {year}.</li>"

			html.append("<div class=%s>\n"%("discreet-paragraph-article"))
			html.append(citation_text)
			html.append("</div>\n")

		html.append("</ul>"+'\n')

	html.append("</div>"+'\n')

	return '\n'.join(html)



# Update the path to your BibTeX file

entries = parse_bibtexes({'paper':'paper_BG.bib', 'preprint':'preprints_BG.bib'})
entries_conf = parse_bibtex('conf.bib', etype = 'conf', citations = False)
# markdown_bibliography = generate_markdown(entries)
markdown_bibliography = generate_html_papers(entries)
conf_html = generate_html_conf(entries_conf)

N_papers = 0
for vals in entries:
	if(vals['type'] == 'paper'):
		N_papers += 1

metrics = {
	"Journal\nArticles": N_papers,
	"Conference\nPapers": len(entries_conf),
	"Research\nSoftware": 0,
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
	file.write(markdown_bibliography)
	file.write(conf_html)
