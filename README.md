# Iron Home (Supabase + Realtime)

## ติดตั้ง
1. รัน `supabase/migrations/20261124070000_iron_home_state.sql` ใน Supabase SQL Editor
2. ใส่ Project URL และ anon/publishable key ใน `config.js` (ห้ามใช้ service_role)
3. อัปโหลดทุกไฟล์ขึ้น root ของ GitHub repository และเปิด GitHub Pages
4. ตั้ง Supabase Authentication > URL Configuration ให้ตรงกับ URL ของ GitHub Pages
5. เปิดเว็บ ไปที่ Settings แล้วสร้างบัญชี/เข้าสู่ระบบด้วยอีเมลเดียวกันทุกอุปกรณ์

## ฟีเจอร์หลัก
- เพิ่ม แก้ไข ลบ Workout plan และเลือกท่าจาก exercises-dataset
- แสดง GIF ใน Workout plan และ Session; แตะ GIF เพื่อเปิด Modal ขนาดใหญ่
- ค้นหา/กรองท่าตามกล้ามเนื้อและอุปกรณ์โดยไม่รีเฟรชทั้งหน้า
- Supabase Auth, Realtime sync และ local offline cache
- ตารางเริ่มต้น Upper Body A, Lower Body (knee-friendly), Upper Body B สำหรับ dumbbell/body weight

ข้อมูลท่าและสื่อ: https://github.com/hasaneyldrm/exercises-dataset
สื่อออกกำลังกายเป็นของ Gym visual ตาม attribution ใน dataset และ NOTICE ของ repository ต้นทาง
