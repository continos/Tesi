# Makefile semplice per compilare la tesi in LaTeX

# Compilatore LaTeX da usare
LATEXMK = latexmk

# Opzioni per latexmk: -pdf per generare un PDF, -pvc per compilazione continua (auto-recompile on save)
# -interaction=nonstopmode per non fermarsi in caso di errori minori
OPTIONS = -pdf -interaction=nonstopmode

# Il nome del file principale .tex (senza estensione)
MAIN_FILE = tesi

# Target di default
all: $(MAIN_FILE).pdf

# Regola per creare il PDF
$(MAIN_FILE).pdf: $(MAIN_FILE).tex *.tex *.bib
	$(LATEXMK) $(OPTIONS) $(MAIN_FILE)

# Target per la compilazione continua (molto utile durante la scrittura)
watch:
	$(LATEXMK) -pvc $(OPTIONS) $(MAIN_FILE)

# Target per pulire i file ausiliari generati da LaTeX
clean:
	$(LATEXMK) -c

# Target per una pulizia più profonda
clean-all:
	$(LATEXMK) -C

.PHONY: all watch clean clean-all
