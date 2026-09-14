using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

// Small Windows shell around the unchanged local transfer server.
class Launcher {
    static readonly string Root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
    static readonly string Data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ThePortal", "Data");
    static readonly string Node = Path.Combine(Root, "runtime", "node.exe");
    static readonly string State = Path.Combine(Data, "process.txt");
    const string Address = "http://127.0.0.1:48831/";
    static Process OwnedProcess() {
        try {
            string[] saved = File.ReadAllLines(State);
            Process p = Process.GetProcessById(int.Parse(saved[0]));
            if (p.StartTime.ToUniversalTime().Ticks.ToString() == saved[1] &&
                string.Equals(p.MainModule.FileName, Node, StringComparison.OrdinalIgnoreCase)) return p;
        } catch { }
        return null;
    }
    static bool Ready() {
        try {
            HttpWebRequest r = (HttpWebRequest)WebRequest.Create(Address + "api/health");
            r.Proxy = null; r.Timeout = 500;
            using (var response = r.GetResponse())
            using (var reader = new StreamReader(response.GetResponseStream()))
                return reader.ReadToEnd().Contains("\"app\":\"ThePortal\"");
        } catch { return false; }
    }
    [STAThread]
    static int Main(string[] args) {
        bool stop = Array.IndexOf(args, "--stop") >= 0;
        bool quiet = Array.IndexOf(args, "--quiet") >= 0;
        bool noBrowser = Array.IndexOf(args, "--no-browser") >= 0;
        Directory.CreateDirectory(Data);
        using (var mutex = new Mutex(false, "Local\\ThePortal.Launcher")) {
            bool acquired = false;
            try {
                try { acquired = mutex.WaitOne(15000); } catch (AbandonedMutexException) { acquired = true; }
                if (!acquired) throw new Exception("ThePortal is already starting. Try again in a moment.");
                Process p = OwnedProcess();
                if (stop) {
                    if (p != null) {
                        if (!quiet && MessageBox.Show("Finish any transfers first. Stop ThePortal?", "ThePortal", MessageBoxButtons.OKCancel) != DialogResult.OK) return 0;
                        p.Kill();
                        if (!p.WaitForExit(10000)) throw new Exception("ThePortal is still stopping. Try again.");
                    }
                    if (File.Exists(State)) File.Delete(State);
                    return 0;
                }
                if (p == null) {
                    if (Ready()) throw new Exception("Another copy of ThePortal is using port 48831. Stop that copy before opening this installation. Your files have not been moved.");
                    var start = new ProcessStartInfo(Node, "\"" + Path.Combine(Root, "ThePortal.runtime.mjs") + "\"");
                    start.UseShellExecute = false; start.CreateNoWindow = true; start.WorkingDirectory = Root;
                    start.EnvironmentVariables["PORTAL_DATA_DIR"] = Data;
                    start.EnvironmentVariables["PORTAL_PORT"] = "48831";
                    // Do not inherit shell overrides that could change the installed app's behavior.
                    start.EnvironmentVariables.Remove("NODE_OPTIONS");
                    start.EnvironmentVariables.Remove("PORTAL_LOCAL_ONLY");
                    start.EnvironmentVariables.Remove("PORTAL_LAN_IP");
                    p = Process.Start(start);
                    File.WriteAllLines(State, new string[] {p.Id.ToString(), p.StartTime.ToUniversalTime().Ticks.ToString()});
                }
                bool ready = false;
                for (int i = 0; i < 100; i++) {
                    if (p.HasExited) throw new Exception("ThePortal could not start. Port 48831 may be in use by another app.");
                    if (Ready()) { ready = true; break; }
                    Thread.Sleep(100);
                }
                if (!ready) throw new Exception("ThePortal did not become ready. Use Stop ThePortal, then try opening it again.");
                if (!noBrowser) Process.Start(new ProcessStartInfo(Address) {UseShellExecute = true});
                return 0;
            } catch (Exception e) {
                File.WriteAllText(Path.Combine(Data, "launcher-error.txt"), e.ToString());
                if (!quiet) MessageBox.Show(e.Message, "ThePortal", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            } finally { if (acquired) mutex.ReleaseMutex(); }
        }
    }
}
