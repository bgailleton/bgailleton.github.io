import bibtexparser
import json

def read_bibtex(bibtex_file):
    """Read BibTeX file and return parsed entries."""
    with open(bibtex_file) as file:
        bib_database = bibtexparser.load(file)
    return bib_database.entries

def classify_entries(entries):
    """Classify each entry and build a dictionary."""
    classification_dict = {'Unknown Journal':{}}

    for entry in entries:
        title = entry.get('title', 'Unknown Title')
        journal = entry.get('journal', 'Unknown Journal')

        if(journal in classification_dict.keys() and journal != 'Unknown Journal'):
            continue
        
        # Display the entry information
        print(f"\nTitle: {title}")
        print(f"Journal: {journal}")
        
        # Prompt the user for classification
        print("Classify this journal: ")
        print("  0 - Article Journal")
        print("  1 - Software")
        print("  2 - Conference")
        print("  3 - Dataset")
        print("  4 - Other")
        
        # Capture the classification
        classification = input("Enter classification (0-4): ")
        while classification not in {'0', '1', '2', '3', '4'}:
            print("Invalid input. Please enter a number from 0 to 4.")
            classification = input("Enter classification (0-4): ")
        
        # Store classification in dictionary
        if(journal != 'Unknown Journal'):
            classification_dict[journal] = int(classification)
        else:
            classification_dict[journal][title] = int(classification)

    
    return classification_dict

def save_classification_dict(classification_dict, output_file):
    """Save classification dictionary to a JSON file."""
    with open(output_file, 'w') as file:
        json.dump(classification_dict, file, indent=4)
    print(f"\nClassification dictionary saved to {output_file}")

# Main Script Execution
if __name__ == "__main__":
    bibtex_file = input("Enter the path to your BibTeX file: ")
    output_file = input("Enter the output filename for the dictionary (e.g., journal_classification.json): ")
    
    entries = read_bibtex(bibtex_file)
    classification_dict = classify_entries(entries)
    save_classification_dict(classification_dict, output_file)
