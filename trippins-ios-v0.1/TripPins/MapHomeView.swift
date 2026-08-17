import SwiftUI
import MapKit

struct IdentifiedPlaceID: Identifiable { let id: UUID }

struct MapHomeView: View {
    @EnvironmentObject private var store: PlaceStore
    @StateObject private var searchService = MapSearchService()
    @State private var query = ""
    @State private var selectedMapItem: MKMapItem?
    @State private var selectedSavedPlaceID: UUID?
    @State private var cameraCommand: MapCameraCommand?
    @State private var addSourceTarget: IdentifiedPlaceID?
    @State private var detailTarget: IdentifiedPlaceID?

    var body: some View {
        ZStack(alignment: .top) {
            ApplePOIMapView(selectedMapItem: $selectedMapItem, selectedSavedPlaceID: $selectedSavedPlaceID, savedPlaces: store.places, cameraCommand: cameraCommand).ignoresSafeArea()

            VStack(spacing: 10) {
                header
                searchPanel
                Spacer()
            }.padding(.horizontal, 12).padding(.top, 4)

            if let selectedMapItem {
                VStack {
                    Spacer()
                    SelectedPOICard(item: selectedMapItem, onClose: { self.selectedMapItem = nil }, onAddSource: { id in addSourceTarget = IdentifiedPlaceID(id: id) }, onOpenSavedPlace: { id in detailTarget = IdentifiedPlaceID(id: id) })
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.snappy, value: selectedMapItem?.identifier?.rawValue)
        .onChange(of: selectedSavedPlaceID) { _, newValue in
            guard let id = newValue else { return }
            detailTarget = IdentifiedPlaceID(id: id)
            selectedSavedPlaceID = nil
        }
        .sheet(item: $addSourceTarget) { target in AddSourceSheet(placeID: target.id) }
        .sheet(item: $detailTarget) { target in
            PlaceDetailView(placeID: target.id) { id in
                detailTarget = nil
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { addSourceTarget = IdentifiedPlaceID(id: id) }
            }
        }
    }

    private var header: some View {
        HStack {
            HStack(spacing: 9) {
                Image(systemName: "mappin.and.ellipse").foregroundStyle(.white).frame(width: 34, height: 34).background(.green, in: RoundedRectangle(cornerRadius: 11))
                VStack(alignment: .leading, spacing: 0) {
                    Text("旅迹").font(.headline)
                    Text("Apple Maps × 小红书").font(.caption2).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text("点地图 POI 直接收藏").font(.caption2.bold()).foregroundStyle(.green).padding(.horizontal, 10).padding(.vertical, 7).background(.green.opacity(0.12), in: Capsule())
        }
        .padding(9)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18))
        .shadow(color: .black.opacity(0.08), radius: 16, y: 6)
    }

    private var searchPanel: some View {
        VStack(spacing: 0) {
            HStack {
                Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                TextField("Apple 地图搜索，例如：东京塔", text: $query)
                    .textInputAutocapitalization(.never)
                    .submitLabel(.search)
                    .onSubmit { Task { await searchService.search(query) } }
                if searchService.isSearching {
                    ProgressView().controlSize(.small)
                } else if !query.isEmpty {
                    Button { query = ""; searchService.clear() } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }.buttonStyle(.plain)
                }
            }.padding(11)

            if !searchService.results.isEmpty {
                Divider()
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(searchService.results.enumerated()), id: \.offset) { _, item in
                            Button {
                                selectedMapItem = item
                                cameraCommand = MapCameraCommand(coordinate: item.placemark.coordinate, distance: 1700)
                                query = ""
                                searchService.clear()
                            } label: {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(item.name ?? "地点").font(.subheadline.bold()).foregroundStyle(.primary)
                                    Text(item.placemark.title ?? "").font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                                }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 11).padding(.vertical, 9)
                            }.buttonStyle(.plain)
                            Divider().padding(.leading, 11)
                        }
                    }
                }.frame(maxHeight: 240)
            } else if let error = searchService.errorMessage {
                Divider()
                Text(error).font(.caption).foregroundStyle(.secondary).padding(11).frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.08), radius: 16, y: 6)
    }
}
