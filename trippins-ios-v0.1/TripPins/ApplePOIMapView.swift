import SwiftUI
import MapKit

struct MapCameraCommand: Equatable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
    let distance: CLLocationDistance

    static func == (lhs: MapCameraCommand, rhs: MapCameraCommand) -> Bool {
        lhs.id == rhs.id
    }
}

final class SavedPlaceAnnotation: NSObject, MKAnnotation {
    let placeID: UUID
    let coordinate: CLLocationCoordinate2D
    let title: String?
    let subtitle: String?

    init(place: SavedPlace) {
        self.placeID = place.id
        self.coordinate = place.coordinate
        self.title = place.name
        self.subtitle = place.sourceLinks.isEmpty ? "旅迹收藏" : "\(place.sourceLinks.count) 条攻略"
    }
}

struct ApplePOIMapView: UIViewRepresentable {
    @Binding var selectedMapItem: MKMapItem?
    @Binding var selectedSavedPlaceID: UUID?
    var savedPlaces: [SavedPlace]
    var cameraCommand: MapCameraCommand?

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView(frame: .zero)
        mapView.delegate = context.coordinator
        mapView.selectableMapFeatures = [.pointsOfInterest]
        mapView.showsCompass = true
        mapView.showsScale = false
        mapView.showsUserLocation = true

        let initial = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 35.6812, longitude: 139.7671),
            span: MKCoordinateSpan(latitudeDelta: 0.12, longitudeDelta: 0.12)
        )
        mapView.setRegion(initial, animated: false)

        context.coordinator.syncSavedAnnotations(on: mapView, places: savedPlaces)
        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        context.coordinator.parent = self
        context.coordinator.syncSavedAnnotations(on: mapView, places: savedPlaces)

        if let cameraCommand,
           context.coordinator.lastCameraCommandID != cameraCommand.id {
            context.coordinator.lastCameraCommandID = cameraCommand.id

            let camera = MKMapCamera(
                lookingAtCenter: cameraCommand.coordinate,
                fromDistance: cameraCommand.distance,
                pitch: 35,
                heading: 0
            )
            mapView.setCamera(camera, animated: true)
        }
    }

    final class Coordinator: NSObject, MKMapViewDelegate {
        var parent: ApplePOIMapView
        var lastCameraCommandID: UUID?

        init(parent: ApplePOIMapView) {
            self.parent = parent
        }

        func syncSavedAnnotations(on mapView: MKMapView, places: [SavedPlace]) {
            let old = mapView.annotations.compactMap { $0 as? SavedPlaceAnnotation }
            mapView.removeAnnotations(old)
            mapView.addAnnotations(places.map(SavedPlaceAnnotation.init))
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            if annotation is MKUserLocation { return nil }
            guard let saved = annotation as? SavedPlaceAnnotation else { return nil }

            let identifier = "TripPinsSavedPlace"
            let view = (mapView.dequeueReusableAnnotationView(withIdentifier: identifier)
                        as? MKMarkerAnnotationView)
                ?? MKMarkerAnnotationView(annotation: saved, reuseIdentifier: identifier)

            view.annotation = saved
            view.canShowCallout = false
            view.markerTintColor = .systemGreen
            view.glyphImage = UIImage(systemName: "bookmark.fill")
            view.displayPriority = .required
            return view
        }

        func mapView(_ mapView: MKMapView, didSelect view: MKAnnotationView) {
            if let saved = view.annotation as? SavedPlaceAnnotation {
                parent.selectedSavedPlaceID = saved.placeID
                mapView.deselectAnnotation(saved, animated: false)
                return
            }

            guard let feature = view.annotation as? MKMapFeatureAnnotation else { return }
            let request = MKMapItemRequest(mapFeatureAnnotation: feature)

            Task { @MainActor in
                do {
                    let item = try await request.mapItem
                    self.parent.selectedMapItem = item
                } catch {
                    print("[TripPins] failed to resolve Apple Maps POI:", error)
                }
            }
        }
    }
}
