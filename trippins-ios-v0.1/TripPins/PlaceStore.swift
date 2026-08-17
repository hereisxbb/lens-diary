import Foundation
import MapKit

@MainActor
final class PlaceStore: ObservableObject {
    @Published private(set) var places: [SavedPlace] = []

    private let storageKey = "TripPins.savedPlaces.v1"

    init() {
        load()
    }

    func savedPlace(matching item: MKMapItem) -> SavedPlace? {
        places.first(where: { $0.matches(item) })
    }

    @discardableResult
    func save(_ item: MKMapItem) -> SavedPlace {
        if let existing = savedPlace(matching: item) {
            return existing
        }

        let place = SavedPlace.from(item)
        places.insert(place, at: 0)
        persist()
        return place
    }

    func addSource(_ source: SourceLink, to placeID: UUID) {
        guard let index = places.firstIndex(where: { $0.id == placeID }) else { return }

        let duplicate = places[index].sourceLinks.contains {
            $0.url.trimmingCharacters(in: .whitespacesAndNewlines)
                .caseInsensitiveCompare(source.url.trimmingCharacters(in: .whitespacesAndNewlines)) == .orderedSame
        }

        guard !duplicate else { return }
        places[index].sourceLinks.insert(source, at: 0)
        persist()
    }

    func removeSource(_ sourceID: UUID, from placeID: UUID) {
        guard let index = places.firstIndex(where: { $0.id == placeID }) else { return }
        places[index].sourceLinks.removeAll { $0.id == sourceID }
        persist()
    }

    func removePlace(_ placeID: UUID) {
        places.removeAll { $0.id == placeID }
        persist()
    }

    func updateCategory(_ category: String, for placeID: UUID) {
        guard let index = places.firstIndex(where: { $0.id == placeID }) else { return }
        places[index].category = category
        persist()
    }

    func place(id: UUID) -> SavedPlace? {
        places.first(where: { $0.id == id })
    }

    private func persist() {
        do {
            let data = try JSONEncoder().encode(places)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            print("[TripPins] persist failed:", error)
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return }
        do {
            places = try JSONDecoder().decode([SavedPlace].self, from: data)
        } catch {
            print("[TripPins] load failed:", error)
            places = []
        }
    }
}
