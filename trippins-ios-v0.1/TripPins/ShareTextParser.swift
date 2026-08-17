import Foundation

enum ShareTextParser {
    private static let urlRegex = try! NSRegularExpression(
        pattern: #"https?://[^\s\]\)）>]+"#,
        options: [.caseInsensitive]
    )

    static func parse(_ raw: String) -> ParsedSource {
        let cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)

        guard let match = urlRegex.firstMatch(
            in: cleaned,
            range: NSRange(cleaned.startIndex..., in: cleaned)
        ),
        let range = Range(match.range, in: cleaned) else {
            return ParsedSource(title: defaultTitle(from: cleaned), url: "")
        }

        var url = String(cleaned[range])
        url = url.trimmingCharacters(in: CharacterSet(charactersIn: "，。；;~～"))

        let prefix = String(cleaned[..<range.lowerBound])
            .trimmingCharacters(in: .whitespacesAndNewlines)

        return ParsedSource(
            title: defaultTitle(from: prefix.isEmpty ? cleaned : prefix),
            url: url
        )
    }

    private static func defaultTitle(from text: String) -> String {
        var title = text
            .replacingOccurrences(of: "把口令复制下来，进入【小红书】看笔记", with: "")
            .replacingOccurrences(of: "存下口令，打开【小红书】阅读", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        if let firstLine = title.split(separator: "\n", omittingEmptySubsequences: true).first {
            title = String(firstLine)
        }

        if title.count > 60 {
            title = String(title.prefix(60)) + "…"
        }

        return title.isEmpty ? "小红书攻略" : title
    }
}
