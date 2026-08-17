import SwiftUI
import MapKit

struct PlaceDetailView: View {
    @EnvironmentObject private var store: PlaceStore
    @Environment(\.dismiss) private var dismiss

    let placeID: UUID
    let onAddSource: (UUID) -> Void

    private var place: SavedPlace? { store.place(id: placeID) }

    var body: some View {
        NavigationStack {
            Group {
                if let place {
                    List {
                        Section {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(place.name).font(.title2.bold())
                                Text(place.address).font(.subheadline).foregroundStyle(.secondary)
                                HStack {
                                    Label(place.category, systemImage: "bookmark")
                                    Spacer()
                                    Text("\(place.sourceLinks.count) 条攻略")
                                }.font(.caption).foregroundStyle(.secondary)
                            }.padding(.vertical, 4)
                        }

                        Section("地图") {
                            Button { openInAppleMaps(place) } label: {
                                Label("在 Apple 地图中打开 / 导航", systemImage: "map.fill")
                            }
                            if let placeID = place.applePlaceID {
                                LabeledContent("Apple Place ID") {
                                    Text(placeID).font(.caption2.monospaced()).lineLimit(1)
                                }
                            }
                        }

                        Section {
                            if place.sourceLinks.isEmpty {
                                ContentUnavailableView("还没有攻略", systemImage: "link", description: Text("把小红书链接挂到这个 Apple Maps 地点下面。"))
                            } else {
                                ForEach(place.sourceLinks) { source in
                                    VStack(alignment: .leading, spacing: 7) {
                                        Text(source.title).font(.headline)
                                        if !source.note.isEmpty {
                                            Text(source.note).font(.caption).foregroundStyle(.secondary)
                                        }
                                        Button {
                                            if let url = URL(string: source.url) { UIApplication.shared.open(url) }
                                        } label: {
                                            Label("打开小红书原帖", systemImage: "arrow.up.right.square")
                                        }.font(.subheadline)
                                    }
                                    .padding(.vertical, 3)
                                    .swipeActions {
                                        Button(role: .destructive) { store.removeSource(source.id, from: place.id) } label: {
                                            Label("删除", systemImage: "trash")
                                        }
                                    }
                                }
                            }
                        } header: {
                            HStack {
                                Text("我的小红书")
                                Spacer()
                                Button { onAddSource(place.id) } label: { Image(systemName: "plus") }
                            }
                        }
                    }
                } else {
                    ContentUnavailableView("地点不存在", systemImage: "mappin.slash")
                }
            }
            .navigationTitle("地点")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } }
        }
    }

    private func openInAppleMaps(_ place: SavedPlace) {
        let placemark = MKPlacemark(coordinate: place.coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = place.name
        mapItem.openInMaps(launchOptions: [MKLaunchOptionsMapCenterKey: NSValue(mkCoordinate: place.coordinate)])
    }
}
