from scholarly import scholarly
import time

def get_author_bibtex(author_name):
    # Search for the author by name
    search_query = scholarly.search_author(author_name)
    author = next(search_query, None)
    
    if not author:
        print(f"No author found with the name: {author_name}")
        return
    
    # Retrieve detailed information on the author's publications
    author = scholarly.fill(author, sections=["publications"])
    
    # Loop through each publication and get the BibTeX entry
    for pub in author["publications"]:
        tpub = next(scholarly.search_pubs(pub['bib']['title']))
        bibtex = scholarly.bibtex(tpub)
        print("BibTeX entry:")
        print(bibtex)
        print("\n" + "-" * 40 + "\n")
        time.sleep(0.5)

# Example usage:
get_author_bibtex("Boris Gailleton")
