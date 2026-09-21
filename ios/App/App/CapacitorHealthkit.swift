import Foundation
import Capacitor
import HealthKit

@objc(CapacitorHealthkit)
public class CapacitorHealthkit: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CapacitorHealthkit"
    public let jsName = "CapacitorHealthkit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveQuantitySample", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "available": HKHealthStore.isHealthDataAvailable()
        ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is not available on this device")
            return
        }

        var shareTypes = Set<HKSampleType>()

        if let energyType = HKQuantityType.quantityType(forIdentifier: .dietaryEnergyConsumed) {
            shareTypes.insert(energyType)
        }
        if let proteinType = HKQuantityType.quantityType(forIdentifier: .dietaryProtein) {
            shareTypes.insert(proteinType)
        }
        if let carbsType = HKQuantityType.quantityType(forIdentifier: .dietaryCarbohydrates) {
            shareTypes.insert(carbsType)
        }
        if let fatType = HKQuantityType.quantityType(forIdentifier: .dietaryFatTotal) {
            shareTypes.insert(fatType)
        }

        healthStore.requestAuthorization(toShare: shareTypes, read: nil) { success, error in
            if let error = error {
                call.reject("HealthKit authorization failed: \(error.localizedDescription)")
            } else {
                call.resolve([
                    "authorized": success
                ])
            }
        }
    }

    @objc func saveQuantitySample(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is not available on this device")
            return
        }

        guard let sampleTypeString = call.getString("sampleType"),
              let unitString = call.getString("unit"),
              let amount = call.getDouble("amount") else {
            call.reject("Missing required parameters: sampleType, unit, amount")
            return
        }

        let typeIdentifier: HKQuantityTypeIdentifier
        switch sampleTypeString.lowercased() {
        case "calories", "dietaryenergyconsumed":
            typeIdentifier = .dietaryEnergyConsumed
        case "protein", "dietaryprotein":
            typeIdentifier = .dietaryProtein
        case "carbohydrates", "dietarycarbohydrates", "carbs":
            typeIdentifier = .dietaryCarbohydrates
        case "fat", "dietaryfattotal":
            typeIdentifier = .dietaryFatTotal
        default:
            call.reject("Unsupported sample type: \(sampleTypeString)")
            return
        }

        guard let quantityType = HKQuantityType.quantityType(forIdentifier: typeIdentifier) else {
            call.reject("Invalid quantity type identifier: \(typeIdentifier.rawValue)")
            return
        }

        let unit: HKUnit
        switch unitString.lowercased() {
        case "kcal":
            unit = .kilocalorie()
        case "g":
            unit = .gram()
        case "mg":
            unit = .gramUnit(with: .milli)
        default:
            unit = HKUnit(from: unitString)
        }

        let quantity = HKQuantity(unit: unit, doubleValue: amount)

        let dateFormatter = ISO8601DateFormatter()
        let startDate: Date
        if let startString = call.getString("startDate"), let parsed = dateFormatter.date(from: startString) {
            startDate = parsed
        } else {
            startDate = Date()
        }

        let endDate: Date
        if let endString = call.getString("endDate"), let parsed = dateFormatter.date(from: endString) {
            endDate = parsed
        } else {
            endDate = startDate
        }

        let sample = HKQuantitySample(type: quantityType, quantity: quantity, start: startDate, end: endDate)

        healthStore.save(sample) { success, error in
            if let error = error {
                call.reject("Failed to save HealthKit sample: \(error.localizedDescription)")
            } else {
                call.resolve([
                    "saved": success,
                    "sampleType": sampleTypeString,
                    "amount": amount
                ])
            }
        }
    }
}

