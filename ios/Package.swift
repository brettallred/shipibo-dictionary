// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "ShipiboDictionary",
    platforms: [.iOS(.v15)],
    dependencies: [
        .package(url: "https://github.com/hotwired/turbo-ios", from: "7.0.0")
    ],
    targets: [
        .executableTarget(
            name: "ShipiboDictionary",
            dependencies: [
                .product(name: "Turbo", package: "turbo-ios")
            ]
        )
    ]
)
