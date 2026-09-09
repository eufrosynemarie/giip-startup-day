# Internship Guide 2026/27 — flyer and QR codes

Assets that point students to GAIN Sweden's free Internship Guide 2026/27.

## Files

| File | Use |
|---|---|
| `GAIN-Sweden-internship-guide-flyer-A4.pdf` | Print-ready A4 flyer, one page, fonts embedded |
| `flyer.html` | Editable source for the flyer (self-contained: fonts and QR are inlined) |
| `internship-guide-2026-qr-petrol.png` / `.svg` | QR code in GAIN petrol `#05555E` on white |
| `internship-guide-2026-qr-black.png` / `.svg` | QR code in black on white, safest for copying |
| `internship-guide-2026-qr-petrol-on-mint.png` | QR code in petrol on light mint `#DEFFEF` |

## Target link

All QR codes encode:

```
https://146157467.fs1.hubspotusercontent-eu1.net/hubfs/146157467/Internship%20guide%202026%20(english%20(1).pdf
```

If that file is renamed or re-uploaded in HubSpot, the codes stop working and have to be
regenerated. For printed runs, consider pointing the code at a short URL on a GAIN domain
so the destination can be changed later without reprinting.

## QR specifications

- Error correction level Q (about 25 percent recoverable), version 9, 53 x 53 modules
- Quiet zone of 4 modules is included in every file, do not crop it
- On the flyer the code is 56 mm wide, about 0.9 mm per module
- Keep printed codes at 25 mm or larger and keep the light quiet zone intact

## Regenerating the PDF from the HTML

```
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=GAIN-Sweden-internship-guide-flyer-A4.pdf flyer.html
```

## Notes

- Palette, fonts and copy follow the GAIN brand guidelines: petrol and white lead, lime
  `#ECEF5E` as the highlighter accent, Lora for headings and Inter for body text.
- The `GAIN` wordmark in the flyer header is set in Inter as a stand-in. Replace it with the
  official logo artwork before printing.
