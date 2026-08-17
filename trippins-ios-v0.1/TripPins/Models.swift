import Foundation
import MapKit

struct SourceLink: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var url: String
    var note: String = ""
    var platform: String = "小红书"
    var createdAt: Date = Date()
}

struct SavedPlace: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var applePlaceID: String?
    var name: String
    var address: String
    var latitude: Double
    var longitude: Double
    var category: String = "想去"
    var sourceLinks: [SourceLink] = []
    var createdAt: Date = Date()

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    func matches(_ item: MKMapItem) -> Bool {
        if let applePlaceID,
           let itemID = item.identifier?.rawValue,
           applePlaceID == itemID {
            return true
        }

        let c = item.placemark.coordinate
        let sameName = name.localizedCaseInsensitiveCompare(item.name ?? "") == .orderedSame
        let closeEnough = abs(latitude - c.latitude) < 0.00005 &&
                          abs(longitude - c.longitude) < 0.00005
        return sameName && closeEnough
    }

    static func from(_ item: MKMapItem) -> SavedPlace {
        let coordinate = item.placemark.coordinate
        return SavedPlace(
            applePlaceID: item.identifier?.rawValue,
            name: item.name ?? "未命名地点",
            address: item.placemark.title ?? "",
            latitude: coordinate.latitude,
            longitude: coordinate.longitude
        )
    }
}

struct ParsedSource {
    var title: String
    var url: String
}
