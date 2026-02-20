/* 
  Ruang Rasa Backend
  Fitur: Validasi Libur, Notifikasi Email, Password aman via Properties
*/

const SHEET_CLIENTS = "Responses";
const SHEET_HOLIDAYS = "Holidays";
const MAIL_TO = "ahsanatafsiro@gmail.com"; // GANTI DENGAN EMAIL ANDA

// Fungsi Utama Web App
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Ruang Rasa - Counseling App')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- Setup Password (Jalankan sekali saja di editor) ---
function setupAdminPassword() {
  // Ganti 'admin123' dengan password baru yang diinginkan
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', 'ahtaa_05');
  return "Password berhasil diatur!";
}

// --- Validasi Login ---
function verifyPassword(inputPass) {
  const storedPass = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  return (inputPass === storedPass);
}

// --- Submit Client (Dengan Validasi Libur & Email) ---
function submitClientForm(formObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clientSheet = ss.getSheetByName(SHEET_CLIENTS);
  const holidaySheet = ss.getSheetByName(SHEET_HOLIDAYS);
  
  // 1. VALIDASI TANGGAL LIBUR
  const holidays = holidaySheet.getDataRange().getValues();
  holidays.shift(); // Hapus header
  
  for (let i = 0; i < holidays.length; i++) {
    const hDate = holidays[i][1]; // Kolom Tanggal
    const hTime = holidays[i][2]; // Kolom Jam
    
    // Cek apakah tanggal dan jam user bentrok dengan jadwal libur
    if (hDate.toString() === formObject.date && hTime.toString() === formObject.time) {
      return { success: false, error: "Maaf, jadwal ini sedang tidak tersedia (Libur)." };
    }
  }

  // 2. SIMPAN DATA
  const id = new Date().getTime().toString();
  const timestamp = new Date();
  
  clientSheet.appendRow([
    timestamp, id, formObject.nickname, formObject.service, 
    formObject.date, formObject.time, formObject.message, "Pending"
  ]);
  
  // 3. KIRIM EMAIL NOTIFIKASI KE ADMIN
  try {
    const subject = "Jadwal Baru: " + formObject.nickname;
    const body = `
      Ada jadwal counseling baru masuk:
      
      Nama: ${formObject.nickname}
      Layanan: ${formObject.service}
      Waktu: ${formObject.date} pukul ${formObject.time}
      Pesan: ${formObject.message}
      
      Silakan cek Dashboard Ruang Rasa.
    `;
    MailApp.sendEmail(MAIL_TO, subject, body);
  } catch (e) {
    console.log("Gagal kirim email: " + e.toString());
  }
  
  return { success: true, id: id };
}

// --- Data Dashboard ---
function getAdminData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const clientSheet = ss.getSheetByName(SHEET_CLIENTS);
  const clientData = clientSheet.getDataRange().getValues();
  clientData.shift(); 
  
  const holidaySheet = ss.getSheetByName(SHEET_HOLIDAYS);
  const holidayData = holidaySheet.getDataRange().getValues();
  holidayData.shift();

  // Map Clients
  const clients = clientData.map(row => ({
    id: row[1].toString(), name: row[2], service: row[3], 
    date: formatDate(row[4]), time: row[5], status: row[7]
  })).reverse();

  // Map Holidays (Kirim timestamp untuk identifikasi penghapusan)
  const holidays = holidayData.map(row => ({
    timestamp: row[0].getTime(), // Ambil timestamp object date
    date: formatDate(row[1]), time: row[2], reason: row[3]
  })).reverse();

  return { clients, holidays };
}

// Helper format tanggal agar lebih cantik (YYYY-MM-DD -> DD MMM YYYY)
function formatDate(dateObj) {
  if (!dateObj) return "";
  // Jika string, konversi ke object dulu
  const d = new Date(dateObj);
  return Utilities.formatDate(d, "GMT+7", "dd MMM yyyy");
}

// --- Update Status ---
function updateClientStatus(id, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CLIENTS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toString() === id.toString()) {
      sheet.getRange(i + 1, 8).setValue(newStatus);
      return { success: true };
    }
  }
  return { success: false };
}

// --- Tambah Libur ---
function addHoliday(formObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_HOLIDAYS);
  sheet.appendRow([new Date(), formObject.date, formObject.time, formObject.reason]);
  return { success: true };
}

// --- Hapus Libur (By Timestamp) ---
function deleteHolidayByTimestamp(ts) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_HOLIDAYS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Bandingkan timestamp dalam milidetik
    if (new Date(data[i][0]).getTime() === parseInt(ts)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}
