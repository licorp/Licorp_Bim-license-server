
import React, { useState } from 'react';
import { FileCode, ShieldCheck, Zap, Key, Globe, Lock, Unlock, Copy, Check } from 'lucide-react';

export const IntegrationGuide: React.FC = () => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const handleCopy = (code: string, fileName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const vercelUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/register` : "https://bim-api.vercel.app/api/register";

  const authServiceCode = `using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace DSH_BIMAPI.Services
{
    /// <summary>
    /// Dữ liệu License được lưu trữ cục bộ
    /// </summary>
    public class LicenseData
    {
        public string Email { get; set; }
        public string MachineId { get; set; }
        public DateTime SaveTime { get; set; }
    }

    public class AuthService
    {
        private readonly string _apiUrl = "${vercelUrl}";
        private readonly string _localLicensePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "DSH_BIMTool", "license.dat"
        );

        // Khóa bí mật (AES-256 yêu cầu khóa mạnh). 
        // TRONG THỰC TẾ: Nên sử dụng giải thuật Obfuscation để che giấu chuỗi này trong code.
        private static readonly string SecretKey = "DSH_Secure_BIM_Tool_AES256_Key_2024_@#!";

        public async Task<bool> RegisterAsync(string name, string email, string pass, string company)
        {
            var payload = new { action = "register", fullName = name, email, password = pass, company, machineId = GetMachineId() };
            return await PostActionAsync(payload);
        }

        public async Task<bool> LoginAsync(string email, string pass)
        {
            var payload = new { action = "verify_license", email = email, password = pass, machineId = GetMachineId() };
            bool success = await PostActionAsync(payload);
            if (success) 
            {
                SaveLicenseLocally(new LicenseData { 
                    Email = email, 
                    MachineId = GetMachineId(), 
                    SaveTime = DateTime.Now 
                });
            }
            return success;
        }

        public async Task<bool> CheckAutoLoginAsync()
        {
            try
            {
                if (!File.Exists(_localLicensePath)) return false;
                
                string encryptedBase64 = File.ReadAllText(_localLicensePath);
                string decryptedJson = Decrypt(encryptedBase64);
                
                if (string.IsNullOrEmpty(decryptedJson)) return false;

                var data = JsonConvert.DeserializeObject<LicenseData>(decryptedJson);
                
                // Kiểm tra xem License này có thuộc về máy này không
                if (data.MachineId != GetMachineId()) return false;

                var payload = new { action = "verify_license", email = data.Email, machineId = GetMachineId() };
                return await PostActionAsync(payload);
            }
            catch { return false; }
        }

        private void SaveLicenseLocally(LicenseData data)
        {
            try
            {
                string dir = Path.GetDirectoryName(_localLicensePath);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                
                string json = JsonConvert.SerializeObject(data);
                string encrypted = Encrypt(json);
                File.WriteAllText(_localLicensePath, encrypted);
            }
            catch { }
        }

        private async Task<bool> PostActionAsync(object payload)
        {
            using (var client = new HttpClient())
            {
                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                try {
                    var response = await client.PostAsync(_apiUrl, content);
                    if (response.IsSuccessStatusCode)
                    {
                        var resultJson = await response.Content.ReadAsStringAsync();
                        dynamic result = JsonConvert.DeserializeObject(resultJson);
                        return (bool)result.Success;
                    }
                } catch { return false; }
                return false;
            }
        }

        private string GetMachineId() => Environment.MachineName + "-" + Environment.UserName;

        #region AES-256 Encryption (Enhanced Security)
        
        /// <summary>
        /// Mã hóa AES-256 với IV ngẫu nhiên được đính kèm vào bản mã
        /// </summary>
        private string Encrypt(string plainText)
        {
            byte[] salt = new byte[] { 0x26, 0xdc, 0xff, 0x00, 0xad, 0xed, 0x7a, 0xee, 0xc5, 0xfe, 0x07, 0xaf, 0x4d, 0x08, 0x22, 0x3c };
            using (Aes aes = Aes.Create())
            {
                aes.KeySize = 256;
                var deriveBytes = new Rfc2898DeriveBytes(SecretKey, salt, 1000);
                aes.Key = deriveBytes.GetBytes(32); // 256-bit Key
                aes.GenerateIV(); // Tạo IV ngẫu nhiên cho mỗi lần mã hóa
                
                byte[] iv = aes.IV;
                byte[] encrypted;

                using (var encryptor = aes.CreateEncryptor(aes.Key, iv))
                using (var ms = new MemoryStream())
                {
                    using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                    using (var sw = new StreamWriter(cs))
                    {
                        sw.Write(plainText);
                    }
                    encrypted = ms.ToArray();
                }

                // Kết hợp IV + Bản mã để lưu trữ
                byte[] result = new byte[iv.Length + encrypted.Length];
                Buffer.BlockCopy(iv, 0, result, 0, iv.Length);
                Buffer.BlockCopy(encrypted, 0, result, iv.Length, encrypted.Length);
                
                return Convert.ToBase64String(result);
            }
        }

        private string Decrypt(string cipherTextBase64)
        {
            try
            {
                byte[] fullCipher = Convert.FromBase64String(cipherTextBase64);
                byte[] salt = new byte[] { 0x26, 0xdc, 0xff, 0x00, 0xad, 0xed, 0x7a, 0xee, 0xc5, 0xfe, 0x07, 0xaf, 0x4d, 0x08, 0x22, 0x3c };

                using (Aes aes = Aes.Create())
                {
                    aes.KeySize = 256;
                    var deriveBytes = new Rfc2898DeriveBytes(SecretKey, salt, 1000);
                    aes.Key = deriveBytes.GetBytes(32);
                    
                    byte[] iv = new byte[16];
                    byte[] cipher = new byte[fullCipher.Length - 16];

                    // Tách IV và Bản mã
                    Buffer.BlockCopy(fullCipher, 0, iv, 0, 16);
                    Buffer.BlockCopy(fullCipher, 16, cipher, 0, cipher.Length);
                    aes.IV = iv;

                    using (var decryptor = aes.CreateDecryptor(aes.Key, aes.IV))
                    using (var ms = new MemoryStream(cipher))
                    using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read))
                    using (var sr = new StreamReader(cs))
                    {
                        return sr.ReadToEnd();
                    }
                }
            }
            catch { return ""; }
        }
        #endregion
    }
}`;

  const wpfCode = `// FILE: License_WPF.xaml.cs
using System.Windows;
using DSH_BIMAPI.Services;

namespace DSH_BIMAPI.LicenseManager
{
    public partial class License_WPF : Window
    {
        private readonly AuthService _auth = new AuthService();
        public string UserEmail { get; set; }

        public License_WPF() { InitializeComponent(); }

        private void SwitchToRegister_Click(object sender, RoutedEventArgs e)
        {
            LoginView.Visibility = Visibility.Collapsed;
            RegisterView.Visibility = Visibility.Visible;
        }

        private void SwitchToLogin_Click(object sender, RoutedEventArgs e)
        {
            RegisterView.Visibility = Visibility.Collapsed;
            LoginView.Visibility = Visibility.Visible;
        }

        private async void BtnLogin_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(TxtLoginEmail.Text) || string.IsNullOrEmpty(TxtLoginPass.Password))
            {
                MessageBox.Show("Vui lòng nhập Email và Mật khẩu!");
                return;
            }

            // Logic đăng nhập nâng cao: lưu trữ LicenseData (Email + MachineId) mã hóa AES-256
            bool success = await _auth.LoginAsync(TxtLoginEmail.Text, TxtLoginPass.Password);

            if (success)
            {
                this.UserEmail = TxtLoginEmail.Text;
                this.DialogResult = true;
                this.Close();
            }
            else
            {
                MessageBox.Show("Đăng nhập thất bại. Tài khoản sai hoặc chưa được kích hoạt!");
            }
        }

        private async void BtnRegister_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(TxtRegEmail.Text))
            {
                MessageBox.Show("Vui lòng nhập Email!");
                return;
            }

            bool success = await _auth.RegisterAsync(
                TxtRegName.Text,
                TxtRegEmail.Text,
                TxtRegPass.Password,
                TxtRegCompany.Text
            );

            if (success)
            {
                MessageBox.Show("Yêu cầu đã được gửi! Vui lòng chờ Admin phê duyệt.");
                SwitchToLogin_Click(null, null);
            }
            else
            {
                MessageBox.Show("Email đã tồn tại hoặc lỗi kết nối.");
            }
        }
    }
}`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in">
      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center gap-6">
        <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Mã hóa AES-256 Enhanced (C#)</h3>
          <p className="text-slate-400 text-sm mt-1">Sử dụng thuật toán AES-256 bit với IV ngẫu nhiên để bảo vệ tệp tin license.dat tối đa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-slate-800 uppercase tracking-wide text-xs">AuthService.cs (AES-256 Implementation)</span>
            </div>
            <button 
              onClick={() => handleCopy(authServiceCode, 'auth')} 
              className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {copiedFile === 'auth' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedFile === 'auth' ? 'Đã chép' : 'Sao chép'}
            </button>
          </div>
          <pre className="p-6 bg-slate-900 text-slate-300 font-mono text-[11px] h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-700">
            {authServiceCode}
          </pre>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-slate-800 uppercase tracking-wide text-xs">License_WPF.xaml.cs (Updated logic)</span>
            </div>
            <button 
              onClick={() => handleCopy(wpfCode, 'wpf')} 
              className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {copiedFile === 'wpf' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedFile === 'wpf' ? 'Đã chép' : 'Sao chép'}
            </button>
          </div>
          <pre className="p-6 bg-slate-900 text-slate-300 font-mono text-[11px] h-80 overflow-auto scrollbar-thin scrollbar-thumb-slate-700">
            {wpfCode}
          </pre>
        </div>
      </div>

      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200 flex gap-4">
        <div className="p-2 bg-blue-100 rounded-lg h-fit">
          <Lock className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-bold text-blue-900">Ưu điểm của bản cập nhật này:</h4>
          <ul className="text-sm text-blue-800 mt-2 list-disc ml-5 space-y-1">
            <li><strong>AES-256 Bit:</strong> Sử dụng khóa 256-bit chuẩn quân đội.</li>
            <li><strong>Random IV:</strong> Vector khởi tạo ngẫu nhiên cho mỗi lần mã hóa, chống tấn công từ điển/tần suất.</li>
            <li><strong>LicenseData Object:</strong> Không chỉ email, mã nguồn mới mã hóa cả MachineId để đối chiếu khi đăng nhập tự động.</li>
            <li><strong>PBKDF2 Key Derivation:</strong> Sử dụng Rfc2898DeriveBytes với Salt để tạo khóa an toàn từ chuỗi SecretKey.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
