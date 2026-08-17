import SwiftUI

struct LibraryTarget: Identifiable { let id: UUID }

struct LibraryView: View {
    @EnvironmentObject private var store: PlaceStore
    @State private var query = ""
    @State private var selectedTarget: LibraryTarget?
    @State private var addSourceTarget: LibraryTarget?

    private var filtered: [SavedPlace] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return store.places }
        return store.places.filter { [$0.name, $0.address, $0.category].joined(separator: " ").localizedCaseInsensitiveContains(q) }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(filtered) { place in
                    Button { selectedTarget = LibraryTarget(id: place.id) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "mappin.circle.fill").font(.title2).foregroundStyle(.green)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(place.name).foregroundStyle(.primary).font(.headline)
                                Text(place.address).foregroundStyle(.secondary).font(.caption).lineLimit(1)
                                Text("\(place.sourceLinks.count) 条小红书攻略").foregroundStyle(.secondary).font(.caption2)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                        }
                    }.buttonStyle(.plain)
                }
                .onDelete { offsets in
                    for offset in offsets { store.removePlace(filtered[offset].id) }
                }
            }
            .navigationTitle("我的地点")
            .searchable(text: $query, prompt: "搜索地点")
            .overlay {
                if store.places.isEmpty {
                    ContentUnavailableView("还没有地点", systemImage: "map", description: Text("去地图页直接点 Apple Maps 上的 POI。"))
                }
            }
            .sheet(item: $selectedTarget) { target in
                PlaceDetailView(placeID: target.id) { placeID in
                    selectedTarget = nil
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { addSourceTarget = LibraryTarget(id: placeID) }
                }
            }
            .sheet(item: $addSourceTarget) { target in AddSourceSheet(placeID: target.id) }
        }
    }
}
