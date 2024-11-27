from scholarly import scholarly
from scholarly import scholarly, MaxTriesExceededException
import time
import json
import random

def dict_to_bibtex(entry):
	"""Convert a dictionary to a formatted BibTeX entry."""
	entry_type = entry.get('ENTRYTYPE', 'article')
	cite_key = entry.get('ID', 'unknown_key')
	
	# Start with the BibTeX entry type and citation key
	bibtex_entry = f"@{entry_type}{{{cite_key},\n"
	
	# Add each field in the dictionary
	for key, value in entry.items():
		if key not in {'ENTRYTYPE', 'ID'}:  # Skip the type and ID as they are already used
			bibtex_entry += f"  {key} = {{{value}}},\n"
	
	bibtex_entry += "}\n"
	return bibtex_entry



def save_bibtex_file(entries, filename="output.bib"):
	"""Convert a list of dictionaries to a BibTeX file format."""
	with open(filename, 'w+') as file:
		for entry in entries:
			bibtex_entry = dict_to_bibtex(entry)
			file.write(bibtex_entry + '\n')


def fetch_bibtex_entries(author_name):
	"""Fetches all BibTeX entries for an author's publications on Google Scholar."""
	bibtex_entries = []
	try:
		# Search for the author
		search_query = scholarly.search_author(author_name)
		author = next(search_query, None)

		if not author:
			print(f"No author found with the name: {author_name}")
			return

		# Fill in the author's publications
		author = scholarly.fill(author, sections=["publications"])
		time.sleep(random.uniform(3, 6))  # Initial delay

		# Loop through each publication and get the BibTeX entry
		for pub in author["publications"]:
			try:
				print("Processing:", pub['bib']['title'])
				pub_filled = scholarly.fill(pub)
				
				# Add the BibTeX entry for each publication
				bibtex = scholarly.bibtex(pub_filled)
				bibtex_entries.append(bibtex)
				print("BibTeX added for:", pub['bib']['title'])

				# Randomized sleep to avoid detection
				time.sleep(random.uniform(4, 8))

			except MaxTriesExceededException:
				print("Encountered MaxTriesExceededException. Retrying after a longer delay...")
				time.sleep(random.uniform(30, 60))  # Long wait before retrying the loop
			except Exception as e:
				print(f"Failed to process {pub['bib']['title']}: {e}")

	except MaxTriesExceededException:
		print("Could not fetch author due to repeated failures.")
	
	return bibtex_entries




# Example usage
author_name = "Boris Gailleton"
bibtex_content = fetch_bibtex_entries(author_name)
save_bibtex_file(bibtex_content)
"""Save classification dictionary to a JSON file."""
# with open('all_pubs.pkl', 'w') as file:
# 	json.dump(full_pubs, file, indent=4)
print("BibTeX entries saved to output.bib")
