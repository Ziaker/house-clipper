using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace HouseClipperLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string mainPy = Path.Combine(appDir, "main.py");

            if (!File.Exists(mainPy))
            {
                MessageBox.Show("Arquivo main.py não encontrado no diretório:\n" + appDir, 
                                "House Clipper - Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // Procura o interpretador Python
            string pythonExe = FindPythonExecutable();
            if (string.IsNullOrEmpty(pythonExe))
            {
                MessageBox.Show("Python não foi encontrado instalado no sistema. Por favor, certifique-se de que o Python 3 está instalado.", 
                                "House Clipper - Erro", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = pythonExe,
                    Arguments = "\"" + mainPy + "\"",
                    WorkingDirectory = appDir,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                Process proc = Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao iniciar o House Clipper:\n" + ex.Message, 
                                "House Clipper - Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static string FindPythonExecutable()
        {
            string[] commonPaths = new string[]
            {
                @"C:\Python313\python.exe",
                @"C:\Python313\pythonw.exe",
                @"C:\Python312\python.exe",
                @"C:\Python311\python.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Python\Python313\python.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Python\Python312\python.exe"),
                "python.exe"
            };

            foreach (string p in commonPaths)
            {
                if (p.Contains(@"\"))
                {
                    if (File.Exists(p)) return p;
                }
                else
                {
                    // Tenta achar no PATH
                    string pathVar = Environment.GetEnvironmentVariable("PATH");
                    if (!string.IsNullOrEmpty(pathVar))
                    {
                        foreach (string folder in pathVar.Split(';'))
                        {
                            try
                            {
                                string full = Path.Combine(folder.Trim(), p);
                                if (File.Exists(full)) return full;
                            }
                            catch { }
                        }
                    }
                }
            }

            return "python.exe";
        }
    }
}
