# สะพานภาษา · Karen Bridge

เว็บไซต์พจนานุกรม **กะเหรี่ยงสะกอ (S’gaw Karen / ksw) – ไทย – อังกฤษ**

**เว็บ:** https://pharanyooosoth.github.io/karen-bridge/

รุ่นเริ่มต้นสำหรับค้นคำและวลีที่มีข้อมูลอ้างอิง **ยังไม่ใช่ตัวแปลประโยคหรือเสียงสนทนาอัตโนมัติเต็มรูปแบบ**

- 1,037 คำเขียน / 1,200 รายการจาก Wiktionary ผ่าน Kaikki
- ความหมายไทยฉบับร่าง 375 รายการ แปลจากอังกฤษ ยังไม่ได้ตรวจโดยเจ้าของภาษา
- คำอ่านโรมัน / IPA เมื่อแหล่งข้อมูลมี
- 2 ไฟล์เสียงต้นฉบับจาก Wikimedia Commons; คำอื่นแจ้งว่าไม่มีเสียง
- รับเสียงไทย/อังกฤษเมื่อเบราว์เซอร์รองรับ และอนุญาตไมค์
- ค้นกะเหรี่ยง Unicode กลับเป็นอังกฤษ/ไทยเท่าที่มี บันทึกคำโปรด ส่งออก JSON
- ไม่มี API key, ไม่มี backend, ไม่มี analytics; ค้นใน browser ส่วนเสียง/ฟอนต์/ลิงก์อ้างอิงต้องใช้อินเทอร์เน็ต

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
- [ ] ประเมินโมเดลแปลประโยคด้วยชุดทดสอบจากชุมชน ก่อนเพิ่ม backend

อ่าน [ผลค้นคว้า](docs/RESEARCH.md) และ [วิธีทดสอบ](docs/QA.md)

## License

โค้ด MIT; ข้อมูลพจนานุกรมและร่างแปล CC BY-SA 4.0; เสียงตามใบอนุญาตรายไฟล์ ดู ATTRIBUTION.md
