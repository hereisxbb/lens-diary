import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    private let appGroup = "group.com.hereisxbb.TripPins"

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        Task { await capture() }
    }

    private func capture() async {
        var parts: [String] = []
        for item in extensionContext?.inputItems as? [NSExtensionItem] ?? [] {
            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
                   let object = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier),
                   let url = object as? URL {
                    parts.append(url.absoluteString)
                    continue
                }
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
                   let object = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier),
                   let text = object as? String {
                    parts.append(text)
                }
            }
        }
        UserDefaults(suiteName: appGroup)?.set(parts.joined(separator: "\n"), forKey: "TripPins.pendingSharedText")
        extensionContext?.completeRequest(returningItems: nil)
    }
}
