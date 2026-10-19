import UIKit
import UniformTypeIdentifiers
import WebKit

/// Web 版のゲームを WKWebView でそのまま動かす。
/// アプリに入れた web/ の中身を nyanko://localhost/ として配り、サーバーなしで遊べるようにする
/// （file:// ではなく固定のオリジンにしておくと、localStorage のセーブが安定して残る）。
final class GameViewController: UIViewController, WKNavigationDelegate {
    static let scheme = "nyanko"
    static let host = "localhost"
    private static let background = UIColor(red: 0x04 / 255, green: 0x06 / 255, blue: 0x0e / 255, alpha: 1)

    private var web: WKWebView!

    override func loadView() {
        let v = UIView()
        v.backgroundColor = Self.background
        view = v
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        createWebView()
        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(willResignActive), name: UIApplication.willResignActiveNotification, object: nil)
        nc.addObserver(self, selector: #selector(didBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    private func createWebView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(WebAssetHandler(), forURLScheme: Self.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        #if DEBUG
        DebugConsole.install(on: config.userContentController)
        #endif

        let w = WKWebView(frame: view.bounds, configuration: config)
        w.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        w.isOpaque = false
        w.backgroundColor = Self.background
        w.scrollView.backgroundColor = Self.background
        w.scrollView.isScrollEnabled = false
        w.scrollView.bounces = false
        w.scrollView.contentInsetAdjustmentBehavior = .never
        w.allowsLinkPreview = false
        w.allowsBackForwardNavigationGestures = false
        w.navigationDelegate = self
        #if DEBUG
        // Mac の Safari の「開発」メニューから中身を調べられるように
        if #available(iOS 16.4, *) { w.isInspectable = true }
        #endif
        view.addSubview(w)
        web = w
        w.load(URLRequest(url: Self.startURL()))
    }

    private static func startURL() -> URL {
        var c = URLComponents()
        c.scheme = scheme
        c.host = host
        c.path = "/index.html"
        #if DEBUG
        // 起動引数 -query debug で index.html?debug を開く（診断表示など）
        if let q = UserDefaults.standard.string(forKey: "query"), !q.isEmpty { c.percentEncodedQuery = q }
        #endif
        return c.url!
    }

    // 横画面・全画面で遊ぶ
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    // 画面の端のタッチを、ゲームの操作より先にホームへ戻る動きに取られないように
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    // 裏に回ったら BGM を止め、戻ったら再開する
    @objc private func willResignActive() {
        web.evaluateJavaScript("typeof Sfx!=='undefined'&&Sfx.ctx&&Sfx.ctx.suspend();0", completionHandler: nil)
    }

    @objc private func didBecomeActive() {
        web.evaluateJavaScript("typeof Sfx!=='undefined'&&Sfx.ctx&&Sfx.ctx.resume();0", completionHandler: nil)
    }

    // ゲームの外へは移らない
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(navigationAction.request.url?.scheme == Self.scheme ? .allow : .cancel)
    }

    // WebView の描画プロセスが落ちたら作り直す（セーブは localStorage に残っている）
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.removeFromSuperview()
        createWebView()
    }
}

/// nyanko://localhost/<path> を、アプリの中の web/<path> から返す
final class WebAssetHandler: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true).standardizedFileURL

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
            let res = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "text/plain"])!
            task.didReceive(res)
            task.didFinish()
            return
        }
        let res = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
            "Content-Type": Self.mimeType(file.pathExtension),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ])!
        task.didReceive(res)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mimeType(_ ext: String) -> String {
        switch ext {
        case "html": return "text/html; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "webmanifest": return "application/manifest+json"
        default: return UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        }
    }
}

#if DEBUG
/// デバッグ版だけ：ページのエラーと console.warn/error を Xcode や devicectl --console の出力へ流す
enum DebugConsole {
    final class Handler: NSObject, WKScriptMessageHandler {
        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            print("[web] \(message.body)")
            fflush(stdout)
        }
    }

    static func install(on c: WKUserContentController) {
        c.add(Handler(), name: "log")
        let js = """
        (() => {
          const post = m => { try { webkit.messageHandlers.log.postMessage(String(m)); } catch (e) {} };
          for (const k of ['warn', 'error']) {
            const orig = console[k].bind(console);
            console[k] = (...a) => { post(k + ': ' + a.join(' ')); orig(...a); };
          }
          addEventListener('error', e => post(`error: ${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`));
          addEventListener('unhandledrejection', e => post('rejection: ' + (e.reason && e.reason.message || e.reason)));
          addEventListener('load', () => post(`load ${location.href} ${innerWidth}x${innerHeight} dpr ${devicePixelRatio}`));
        })();
        """
        c.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
}
#endif
