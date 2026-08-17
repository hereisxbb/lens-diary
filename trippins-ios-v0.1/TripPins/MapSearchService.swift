import Foundation
import MapKit

@MainActor
final class MapSearchService: ObservableObject {
    @Published var results: [MKMapItem] = []
    @Published var isSearching = false
    @Published var errorMessage: String?

    private var currentSearch: MKLocalSearch?

    func search(_ query: String) async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmed.isEmpty else {
            results = []
            errorMessage = nil
            return
        }

        currentSearch?.cancel()
        isSearching = true
        errorMessage = nil

        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = trimmed
        request.resultTypes = [.pointOfInterest, .address]

        let search = MKLocalSearch(request: request)
        currentSearch = search

        do {
            let response = try await search.start()
            if !Task.isCancelled {
                results = Array(response.mapItems.prefix(8))
            }
        } catch is CancellationError {
        } catch {
            if !Task.isCancelled {
                errorMessage = "Apple 地图搜索失败，请稍后重试。"
                results = []
            }
        }

        if currentSearch === search {
            currentSearch = nil
            isSearching = false
        }
    }

    func clear() {
        currentSearch?.cancel()
        currentSearch = nil
        results = []
        isSearching = false
        errorMessage = nil
    }
}
