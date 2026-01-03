import pdfplumber

pdf_path = r'c:\Backup_D_Arbeit\D\Data\PRIVATE_dteschner\Privat\PLC_App\Befehle-iHomeControl-K2-0.pdf'
with pdfplumber.open(pdf_path) as pdf:
    for page_num, page in enumerate(pdf.pages):
        print(f'\n===== PAGE {page_num + 1} =====')
        text = page.extract_text()
        print(text)
