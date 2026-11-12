# แปลภาษากะเหรี่ยงจากภาพ · การเชื่อมต่อ OpenAI API

รุ่น 1.2 เตรียมหน้าอัปโหลดและ server endpoint แล้ว แต่เว็บ GitHub Pages จะยังแสดง **ยังไม่ได้เชื่อมต่อบริการ AI** จนเจ้าของตั้งค่า backend และ API key ตามขั้นตอนนี้ ไม่มีคีย์หรือภาพถูกเก็บไว้ใน repository และยังไม่ได้ทดสอบความแม่นยำด้วย API จริง

## วิธีใช้เมื่อเชื่อมต่อแล้ว

1. เปิดเมนู **แปลจากรูปภาพ** เลือก JPG, PNG หรือ WebP ไม่เกิน 10 MB ภาพจะถูกเตรียมในเครื่อง (ด้านยาวไม่เกิน 2,200 px; ภาพที่ส่งไม่เกิน 2 MB)
2. ใส่รหัสเข้าใช้ของเว็บไซต์ และยืนยันการส่งข้อมูล ไม่ใช่การกรอก OpenAI API key
3. กด **อ่านภาพด้วย AI** เพียงเลือกภาพยังไม่ส่งข้อมูล
4. ตรวจและแก้ข้อความเทียบกับภาพ โดยเฉพาะสระและเครื่องหมายเสียง หรือใช้ **ค้นเทียบพจนานุกรม**
5. เลือกไทยหรืออังกฤษแล้วกด **แปลข้อความด้วย AI** แสดงคำแปลและคำอ่านไทยโดยประมาณเมื่อโมเดลให้ได้ พร้อมข้อสงสัย
6. คัดลอกคำแปลหรือดาวน์โหลด JSON ได้ ผลลัพธ์ทั้งหมดเป็นร่าง AI ยังไม่ผ่านเจ้าของภาษา

ข้อความที่พิมพ์เองใช้ขั้นตอนแปลได้โดยไม่ต้องส่งภาพ จำกัด 6,000 ตัวอักษร การอ่านภาพและการแปลเป็นคนละ API request มีค่าใช้บริการตามบัญชี API ผู้ดูแล

## เริ่มต้นเมื่อยังไม่มีบัญชีหรือ API key

1. เข้า [OpenAI Platform](https://platform.openai.com/) สมัครหรือเข้าสู่ระบบด้วยบัญชีของคุณ ทำขั้นตอนยืนยันตัวตน/ข้อตกลงด้วยตัวเอง
2. สร้าง project ชื่อ `Karen Bridge` ผ่าน project selector แล้วเปิด Settings ของ project → API Keys → Create new secret key สำหรับเว็บที่ใช้งานระยะยาวควรใช้ service account ของ project
3. ตรวจหน้า Billing และ Usage/Limits ของบัญชี ตั้งการแจ้งเตือนตามงบที่คุณรับได้ และดำเนินการชำระ/เติมเครดิตด้วยตัวเองหากบัญชีร้องขอ ไม่ถือว่าตัวจำกัดในแอปเป็นเพดานค่าใช้จ่าย
4. เก็บคีย์ในที่ปลอดภัย เพื่อกรอกใน `OPENAI_API_KEY` บน Vercel เท่านั้น ไม่ใส่ใน GitHub, api-config.json หรือช่องรหัสของเว็บ
5. สมัคร/เข้าสู่ระบบ [Vercel](https://vercel.com/) ด้วย GitHub ของคุณ แล้ว Import เฉพาะ repository `karen-bridge` ตามขั้นตอนถัดไป

อ้างอิง: [การสร้าง project และ API key ของ OpenAI](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform), [เลือกชนิด API key/service account](https://developers.openai.com/api/docs/guides/api-keys)

## ติดตั้ง backend บน Vercel

GitHub Pages รัน server ไม่ได้ จึงต้องมี backend แยก รหัสต้นฉบับใน repo นี้รองรับ Vercel Node.js Functions ผ่าน `api/karen.js` และทดสอบในเครื่องผ่าน `server/dev.mjs`

1. เข้า [Vercel](https://vercel.com/new) ด้วยบัญชีของคุณ แล้ว Import repo `pharanyooosoth/karen-bridge` ตั้ง Framework Preset เป็น Other, Build Command `npm run build`, Output Directory `dist`, Node.js 22 ขึ้นไป
2. ตั้ง Environment Variables ของ Production ในหน้าโครงการ ห้ามบันทึกค่าจริงใน GitHub:

| ชื่อ | ค่า |
| --- | --- |
| `OPENAI_API_KEY` | API key ของ OpenAI project ที่คุณจัดการ |
| `APP_ACCESS_CODE` | รหัสสุ่มสำหรับคนที่อนุญาตให้ใช้ อย่างน้อย 16 ตัว และไม่เกิน 256 ตัว |
| `OPENAI_MODEL` | `gpt-4.1-mini` (หรือโมเดลที่รองรับภาพ, Responses API และ Structured Outputs) |
| `ALLOWED_ORIGINS` | `https://pharanyooosoth.github.io` และ origin ของเว็บ Vercel หากจะเปิดเว็บจากที่นั่น คั่นด้วย comma ไม่ใส่ path หรือ slash ท้าย |

สร้างรหัสสุ่มด้วย `openssl rand -hex 24` แล้วใส่ใน Secret/Environment Variables ด้วยตัวเอง ไม่ส่ง API key หรือรหัสจริงในแชต

3. Deploy จากนั้นเปิด `https://YOUR-PROJECT.vercel.app/api/karen` ต้องได้ JSON `ready: true` (แค่ตรวจว่ามี config ยังไม่ยืนยันสิทธิ์คีย์หรือยอดใช้บริการ)
4. แก้ `api-config.json` ใน GitHub เป็น URL จริงของ endpoint โดยใส่เฉพาะ URL สาธารณะ:

```json
{"apiUrl":"https://YOUR-PROJECT.vercel.app/api/karen"}
```

5. Commit เข้า main แล้วรอ Actions deploy Pages เปิดเว็บ GitHub → แปลจากรูปภาพ → ตรวจอีกครั้ง
6. ทดสอบด้วยภาพข้อความสั้นที่คุณรู้คำแปลก่อน ตรวจ OCR, คำแปล และคำอ่านกับผู้รู้ภาษา ถ้า Vercel เปิด Deployment Protection ต้องตั้งให้ Production endpoint เข้าถึงได้จากเว็บ โดย endpoint เองยังตรวจรหัสเข้าใช้ทุกครั้ง

บน Vercel build จะใช้ `/api/karen` ในโดเมนเดียวกันโดยอัตโนมัติ เพิ่ม origin ของโดเมนนั้นใน `ALLOWED_ORIGINS` และ Redeploy หลังแก้ environment variables ส่วน GitHub Pages ใช้ URL จาก `api-config.json` เท่านั้น

## ทดสอบในเครื่อง

Node.js 22+:

```sh
cp .env.example .env
# ตั้งค่าจริงใน .env ผ่าน editor ของคุณ (.env ถูก gitignore)
npm test
npm run build
npm run dev:api
```

เปิด http://127.0.0.1:4173 ค่า `.env` ไม่ถูกคัดลอกเข้า `dist/` ถ้าไม่ใส่คีย์ หน้าเว็บยังดูภาพและค้นพจนานุกรมได้ แต่ปุ่ม AI ถูกปิด

## การเข้าถึง ค่าใช้จ่าย และข้อมูล

- ค่าเริ่มต้นเป็นบริการสำหรับเจ้าของและคนที่ได้รับรหัสเดียวกัน ไม่ใช่ระบบบัญชีสมาชิก รหัสถูกเก็บในช่องกรอกระหว่างเปิดหน้าเท่านั้น ไม่มี localStorage และต้องใช้ HTTPS บนเว็บจริง
- server ตรวจ origin, รหัส, ชนิด/ขนาดข้อมูล และจำกัด 5 คำขอต่อนาที กับพร้อมกัน 2 คำขอ **ต่อ process** การกระจายหลาย instance อาจเพิ่มจำนวนคำขอได้ จึงไม่ใช่โควตากลางหรือเพดานค่าใช้จ่าย ตั้งการติดตาม usage/limits ใน OpenAI project และป้องกัน abuse ที่ผู้ให้บริการ hosting ด้วย
- ก่อนเปิดให้ทุกคนใช้ ควรเพิ่มการล็อกอินและ rate limit แบบ shared storage; อย่าเผยแพร่ APP_ACCESS_CODE บนหน้าเว็บ
- โค้ดแอปไม่บันทึกภาพ/ข้อความลงฐานข้อมูลหรือ log; ส่ง `store:false` ให้ Responses API แต่นี่ไม่ได้รับรองว่าไม่มีการเก็บข้อมูลตามนโยบายของผู้ให้บริการ ดู [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
- การยกเลิกหลังส่งคำขอเป็นการหยุดรอผล บริการภายนอกอาจทำงานต่อและคิดค่าใช้จ่าย
- ตัวอักษรกะเหรี่ยงคล้ายภาษาพม่า โมเดลอาจระบุภาษา อ่านสระ วรรณยุกต์ หรือแปลผิด คำอ่านไทยเป็นเพียงตัวช่วย ต้องประเมินกับเจ้าของภาษาก่อนใช้งานจริงที่สำคัญ

## แก้ปัญหา

- `ready: false`: ตรวจทั้งคีย์, รหัสยาวพอ, และ ALLOWED_ORIGINS แล้ว Redeploy
- เชื่อมต่อไม่ได้: ตรวจ URL, CORS origin, Production Deployment Protection และสถานะ deployment
- รหัสเข้าใช้ไม่ถูกต้อง: ใส่ APP_ACCESS_CODE ไม่ใช่ OPENAI_API_KEY
- บัญชี AI ถึงขีดจำกัด: ตรวจ usage, quota และ billing ใน OpenAI project
- อ่านไม่ครบ: ครอปเฉพาะข้อความที่ชัด แบ่งภาพเป็นหลายส่วน

เอกสารอ้างอิง: [OpenAI images/vision](https://developers.openai.com/api/docs/guides/images-vision), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js)
