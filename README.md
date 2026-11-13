# สะพานภาษา · Karen Bridge

เว็บไซต์พจนานุกรม **กะเหรี่ยงสะกอ (S’gaw Karen / ksw) – ไทย – อังกฤษ**

**เว็บ:** https://pharanyooosoth.github.io/karen-bridge/

รุ่นเริ่มต้นสำหรับค้นคำและวลีที่มีข้อมูลอ้างอิง **ยังไม่ใช่ตัวแปลประโยคหรือเสียงสนทนาอัตโนมัติเต็มรูปแบบ**

- 1,037 คำเขียน / 1,200 รายการจาก Wiktionary ผ่าน Kaikki
- ความหมายไทยฉบับร่าง 375 รายการ แปลจากอังกฤษ ยังไม่ได้ตรวจโดยเจ้าของภาษา
- ค้นย้อนกลับด้วย **คำอ่านภาษาไทย** เช่น ที → น้ำ, ตาบลึ / ตะบลือ → ขอบคุณ เลือกภาษาต้นทาง “คำอ่านภาษาไทย” หรือกดตัวอย่าง “คำอ่าน: ที”; รองรับการเว้นวรรคและขีดคั่นพยางค์ แสดงทุกคำที่เสียงตรงกันโดยไม่เดาความหมาย
- คำอ่านไทยโดยประมาณแสดงก่อนโรมัน / IPA; รูปแบบที่ไม่รองรับแจ้งว่าไม่มีคำอ่านไทย
- ขอบคุณ → ตาบลึ / ตะบลือ (ตัวอย่างจากผู้ใช้); คำอื่นถอดจากโรมันตามกฎใน `thai-reading.js` โดยไม่แปลงวรรณยุกต์และยังไม่ผ่านเจ้าของภาษาตรวจ
- 2 ไฟล์เสียงต้นฉบับจาก Wikimedia Commons; คำอื่นแจ้งว่าไม่มีเสียง
- รับเสียงไทย/อังกฤษเมื่อเบราว์เซอร์รองรับ และอนุญาตไมค์
- ค้นกะเหรี่ยง Unicode กลับเป็นอังกฤษ/ไทยเท่าที่มี บันทึกคำโปรด ส่งออก JSON
- เลือกภาษาต้นทาง/สำเนียงก่อนอ่านภาพ ค่าเริ่มต้นกะเหรี่ยงสะกอในประเทศไทย; โหมดเน้นคำอ่านโดยไม่แปล พร้อมแนบภาพตารางอ้างอิงและบันทึกข้อความอ้างอิงในเครื่อง
- API ได้รับข้อมูลพจนานุกรมที่ตรงกับข้อความกะเหรี่ยงสะกอ และข้อมูลอ้างอิงที่ผู้ใช้เลือกส่ง; ไม่ใช้ประวัติหรือไฟล์จากบัญชี ChatGPT อัตโนมัติ
- เมนูแปลจากรูปภาพ: เตรียมภาพ → OCR → ตรวจแก้ → แปลไทย/อังกฤษ พร้อมคำอ่านไทยฉบับร่างจาก AI
- พจนานุกรมทำงานใน browser โดยไม่ใช้ API key; ฟังก์ชัน AI ต้องตั้ง backend และ OpenAI API key ฝั่ง server ก่อน ดู [คู่มือตั้งค่า](docs/IMAGE-API.md)
- ไม่มี analytics; โค้ดแอปไม่บันทึกภาพหรือข้อความลงฐานข้อมูล

## รันในเครื่อง

ต้องมี Node.js 22+ และ Python 3 (สำหรับ local HTTP server)

```sh
npm test
npm run build
npm run dev
```

เปิด http://127.0.0.1:4173 ไม่เปิด index.html โดยตรงผ่าน file:// เพราะเบราว์เซอร์จะปิดกั้น fetch JSON

## GitHub Pages และ workflow

Repository Settings → Pages → Source: **GitHub Actions**

`.github/workflows/pages.yml` ทดสอบทุก pull request และทุก push ไป main; build ลง dist แล้ว deploy เมื่อ main ผ่าน tests เท่านั้น ไม่มี npm dependencies และไม่ต้องสร้าง secret

## เพิ่มคำและตรวจแก้

1. เปิด issue พร้อมคำต้นทาง ความหมาย บริบท สำเนียง และลิงก์หลักฐาน
2. แก้ `data/thai-glosses.json` เฉพาะ English sense ที่ตรงกัน อย่าจับคู่คำหลายความหมายแบบเหมารวม
3. หากต้องสร้างข้อมูลใหม่ ดาวน์โหลด upstream ตามคำสั่งด้านล่าง แล้วรัน build-data.py
4. ให้ผู้รู้ภาษา review diff; รัน `npm test` และ `npm run build`
5. merge เข้า main → deploy อัตโนมัติ

```sh
curl -fL 'https://kaikki.org/dictionary/S%27gaw%20Karen/kaikki.org-dictionary-SgawKaren.jsonl' -o data/source.jsonl
python3 scripts/build-data.py
npm test
npm run build
```

ต้นฉบับ Kaikki แบบ postprocessed ถูกประกาศ deprecated จึงต้องตรวจหน้าดาวน์โหลดอีกครั้งก่อนอัปเดตในอนาคต ไฟล์ snapshot ที่เว็บใช้คือ `data/dictionary.json` และใช้งานได้โดยไม่เรียก Kaikki ขณะค้น

อย่าเพิ่มเสียงที่ไม่ทราบสิทธิ์หรือใช้ TTS พม่าแทนกะเหรี่ยง รายละเอียดสิทธิ์อยู่ใน [ATTRIBUTION.md](ATTRIBUTION.md)

## แผนงานที่ทำต่อได้

- [x] สำรวจแหล่งข้อมูลและสิทธิ์ใช้งาน
- [x] สร้างเว็บค้นคำสองทิศทาง พร้อมคำอ่าน/ที่มา
- [x] เพิ่ม input เสียงไทย/อังกฤษแบบตรวจความสามารถเบราว์เซอร์
- [x] เตรียม GitHub Pages CI/CD และ tests
- [ ] ให้ชุมชนเป้าหมายยืนยันสำเนียง/ระบบเขียน
- [ ] ตรวจร่างไทยและเพิ่มคำไทยให้ครบ
- [ ] เพิ่มคลิปเสียงและวลีที่เจ้าของภาษาตรวจแล้ว
- [x] เพิ่มหน้าอัปโหลดภาพ และ backend OpenAI พร้อมรหัสเข้าใช้
- [ ] ตั้งค่า backend/API key จริง แล้วตรวจการเชื่อมต่อ
- [ ] ประเมิน OCR/คำแปล/คำอ่านกับชุดทดสอบจากชุมชน

อ่าน [ผลค้นคว้า](docs/RESEARCH.md) และ [วิธีทดสอบ](docs/QA.md)

## License

โค้ด MIT; ข้อมูลพจนานุกรมและร่างแปล CC BY-SA 4.0; เสียงตามใบอนุญาตรายไฟล์ ดู ATTRIBUTION.md
# Sentence translation (v1.5)

The new sentence menu translates complete text between Thai, English and Sgaw Karen (all six directions, up to 6,000 characters). It uses the existing Vercel API configuration and access code. Users choose languages, optionally add context, consent to sending text, and translate. Results remain drafts; Karen pronunciation still requires reference evidence. Swap, copy and cancel controls are included. No sentence history or access code is saved.

Uses the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/text), action `sentence`. The backend must advertise `sentence-translation` (API version 3). No new environment variables or model change is required.

## KTWG source-backed translations (v1.6)

The user-supplied KTWG v2 course is now an actual database, not just a link: 28 pages, 455 extracted rows, 451 enabled records and 4 quarantined conversions. `data/ktwg-course.json` retains original page text, legacy encoding, Unicode conversion, roman reading, English and source pages. `scripts/imports/ktwg.py` reproduces the extraction from the source PDF using explicit wrapped-row corrections; its SHA-256 identifies the imported edition. Thai additions are separate in `data/ktwg-additions.json`.

Both word search and sentence translation use the course. Exact sentence matches are returned locally without an access code or OpenAI call; the protected API has the same deterministic path. Other sentences send up to 8 relevant source records to OpenAI and display their source pages. Unrelated references are not proof of a generated translation. The backend advertises `ktwg-course` (API version 4); no environment-variable change is needed.

Acceptance example: `What is your name?`, `What's your name?`, and `What’s your name?` resolve to `နမံၤဒ်လဲၣ်`, roman `na mee di leh?`, KTWG page 3. Thai aliases include `คุณชื่ออะไร`. The Thai reading aid `นา มี ดิ เล` is explicitly a project approximation, not a Thai transcription in the PDF. See `docs/KTWG-IMPORT.md` for limits and audit details.

### v1.7 — DRUM general and medical vocabulary

Added the two user-provided DRUM PDFs to the actual project database: 958 general entries and 720 medical entries (718 searchable; two source anomalies retained for review). The new **ศัพท์ทางการแพทย์** menu searches medical terms separately by English, available Thai aliases, Karen script, or approximate Thai reading. Each result links to its PDF page.

Medical pronunciation first matches a complete Karen spelling against the general word list's romanization. Other supported spellings receive an explicitly experimental Thai reading based on DRUM's guide; unknown structures return no reading. Tones and dialect differences are not guaranteed. This 2008 glossary is a vocabulary aid, not treatment/dosage guidance.

Both datasets also participate in sentence exact lookup and relevant API context. No new API key or environment variable is needed; Vercel builds include the JSON files. API health is version 5 with `drum-glossary`. [Import and QA details](docs/DRUM-IMPORT.md).
