# Shipibo Dictionary iOS App

A native iOS wrapper for the Shipibo-English dictionary web app using Turbo Native.

## Setup

1. Open Xcode and create a new iOS App project:
   - Product Name: ShipiboDictionary
   - Interface: SwiftUI
   - Language: Swift

2. Copy `ShipiboDictionary/ContentView.swift` into your project

3. Update the URL in ContentView.swift to your production server URL

4. For local development, enable local network access in Info.plist:
   ```xml
   <key>NSAppTransportSecurity</key>
   <dict>
       <key>NSAllowsLocalNetworking</key>
       <true/>
   </dict>
   ```

5. Build and run on simulator or device

## Production

For production deployment:
1. Deploy the Rails app to a server (e.g., Render, Fly.io, Heroku)
2. Update the URL in ContentView.swift to the production URL
3. Archive and submit to App Store

## Full Turbo Native

For advanced native navigation, replace the simple WebView with Turbo:

```swift
import Turbo

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private lazy var navigationController = UINavigationController()

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = navigationController
        window?.makeKeyAndVisible()

        let session = Session(webView: WKWebView())
        session.delegate = self

        let url = URL(string: "https://your-app.com")!
        session.visit(url)
    }
}
```

See: https://github.com/hotwired/turbo-ios
