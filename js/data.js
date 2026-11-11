(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};

  const towns = {
    Mumbai: [19.076, 72.878], Panvel: [18.989, 73.117], Khalapur: [18.829, 73.274],
    Lonavala: [18.754, 73.407], Talegaon: [18.735, 73.676], Pune: [18.520, 73.856],
    Katraj: [18.452, 73.867], Shirwal: [18.142, 73.977], Satara: [17.681, 74.018],
    Umbraj: [17.429, 74.101], Karad: [17.287, 74.184], "Peth Naka": [17.108, 74.274],
    Kolhapur: [16.705, 74.243], Kagal: [16.577, 74.315], Nipani: [16.399, 74.383],
    Sankeshwar: [16.255, 74.482], Belagavi: [15.849, 74.497], Dharwad: [15.458, 75.007],
    Hubballi: [15.364, 75.124], Haveri: [14.795, 75.400], Ranebennur: [14.622, 75.638],
    Davanagere: [14.464, 75.922], Chitradurga: [14.225, 76.398], Sira: [13.741, 76.904],
    Tumakuru: [13.340, 77.102], Bengaluru: [12.972, 77.594],
    Ichalkaranji: [16.692, 74.460], Chennai: [13.083, 80.270], Poonamallee: [13.048, 80.095],
    Sriperumbudur: [12.968, 79.942], Walajapet: [12.925, 79.367], Vellore: [12.916, 79.133],
    Ambur: [12.791, 78.716], Vaniyambadi: [12.681, 78.621], Krishnagiri: [12.519, 78.214],
    Hosur: [12.740, 77.825], "Electronic City": [12.839, 77.677], Hubballi: [15.364, 75.124]
  };

  const mumbaiSegments = [
    ["S01", "Mumbai", "Panvel", 28], ["S02", "Panvel", "Khalapur", 27],
    ["S03", "Khalapur", "Lonavala (Bhor Ghat)", 17, "Lonavala"],
    ["S04", "Lonavala", "Talegaon", 31], ["S05", "Talegaon", "Pune", 32],
    ["S06", "Pune", "Katraj", 8], ["S07", "Katraj", "Shirwal", 38],
    ["S08", "Shirwal", "Satara (Khambatki Ghat)", 56, "Satara"],
    ["S09", "Satara", "Umbraj", 35], ["S10", "Umbraj", "Karad", 17],
    ["S11", "Karad", "Peth Naka", 27], ["S12", "Peth Naka", "Kolhapur", 44],
    ["S13", "Kolhapur", "Kagal", 21], ["S14", "Kagal", "Nipani", 22],
    ["S15", "Nipani", "Sankeshwar", 38], ["S16", "Sankeshwar", "Belagavi", 45],
    ["S17", "Belagavi", "Dharwad", 66], ["S18", "Dharwad", "Hubballi", 20],
    ["S19", "Hubballi", "Haveri", 62], ["S20", "Haveri", "Ranebennur", 40],
    ["S21", "Ranebennur", "Davanagere", 52], ["S22", "Davanagere", "Chitradurga", 60],
    ["S23", "Chitradurga", "Sira", 75], ["S24", "Sira", "Tumakuru", 52],
    ["S25", "Tumakuru", "Bengaluru", 60]
  ];
  const chennaiSegments = [
    ["C01", "Chennai", "Poonamallee", 22], ["C02", "Poonamallee", "Sriperumbudur", 20],
    ["C03", "Sriperumbudur", "Walajapet", 63], ["C04", "Walajapet", "Vellore", 27],
    ["C05", "Vellore", "Ambur", 50], ["C06", "Ambur", "Vaniyambadi", 18],
    ["C07", "Vaniyambadi", "Krishnagiri", 52], ["C08", "Krishnagiri", "Hosur", 50],
    ["C09", "Hosur", "Electronic City", 20], ["C10", "Electronic City", "Bengaluru", 18]
  ];

  function hourValues(segmentId, field) {
    return Array.from({ length: 24 }, function (_, hour) {
      if (field === "risk") {
        if (segmentId === "C07") return hour === 6 ? 0.41 : 0.08;
        if (segmentId === "C09") return hour === 10 ? 0.33 : 0.07;
        if (segmentId === "S12") {
          if (hour < 6) return 0.08;
          if (hour < 9) return [0.18, 0.31, 0.48][hour - 6];
          if (hour <= 11) return [0.69, 0.81, 0.78][hour - 9];
          if (hour <= 14) return [0.62, 0.43, 0.24][hour - 12];
          if (hour <= 18) return [0.16, 0.11, 0.09, 0.07][hour - 15];
          return 0.06;
        }
        if (segmentId === "S11") return hour === 10 ? 0.52 : hour === 9 ? 0.41 : hour === 11 ? 0.47 : 0.08;
        if (segmentId === "S13") return hour === 10 ? 0.44 : hour === 9 ? 0.35 : hour === 11 ? 0.39 : 0.07;
        if (segmentId === "S10") return hour === 10 ? 0.16 : 0.08;
        if (segmentId === "S09") return hour === 10 ? 0.05 : 0.05;
        if (segmentId === "S08") return hour >= 15 && hour <= 17 ? [0.45, 0.42, 0.31][hour - 15] : hour === 10 ? 0.08 : 0.07;
        return 0.04 + ((parseInt(segmentId.slice(1), 10) * 7 + hour * 3) % 9) / 100;
      }
      if (field === "rainMmHr") {
        const values = { S08: { 14: 18, 15: 22, 16: 16 }, S09: { 10: 1 }, S10: { 10: 9 }, S11: { 10: 37 }, S12: { 9: 51, 10: 58, 11: 54, 12: 43, 13: 28, 14: 14, 15: 8, 16: 4, 17: 2, 18: 1 }, S13: { 10: 41, 11: 35, 12: 21 } };
        return values[segmentId] && values[segmentId][hour] || 0;
      }
      if (field === "rainProbability") {
        if (segmentId === "S12") return hour >= 9 && hour <= 12 ? [0.68, 0.72, 0.69, 0.56][hour - 9] : hour === 13 ? 0.38 : 0.12;
        if (segmentId === "S11") return hour === 10 ? 0.56 : 0.18;
        if (segmentId === "S13") return hour === 10 ? 0.49 : 0.15;
        return hourValues(segmentId, "rainMmHr")[hour] > 0 ? 0.38 : 0.05;
      }
      return 0;
    });
  }

  function makeSegment(definition, corridorId, index) {
    const id = definition[0];
    const startTown = definition[1];
    const endTown = definition[4] || definition[2];
    const risk = hourValues(id, "risk");
    const rain = hourValues(id, "rainMmHr");
    const probability = hourValues(id, "rainProbability");
    return {
      id: id,
      name: definition[1] + " – " + definition[2],
      from: startTown,
      to: endTown,
      km: definition[3],
      corridorId: corridorId,
      floodThresholdMmHr: 50,
      historicalBaseline: id === "S12" ? 0.07 : id === "S08" ? 0.05 : 0.04,
      pastFloodScore: id === "S12" ? 0.21 : id === "S08" ? 0.16 : 0.03 + (index % 5) * 0.01,
      risk: risk,
      rainMmHr: rain,
      rainProbability: probability,
      start: { lat: towns[startTown][0], lon: towns[startTown][1] },
      end: { lat: towns[endTown][0], lon: towns[endTown][1] }
    };
  }

  const corridors = [
    {
      id: "mumbai-bengaluru", name: "Mumbai → Bengaluru", highway: "NH48",
      origin: "Mumbai", destination: "Bengaluru", totalKm: 973, segmentIds: mumbaiSegments.map(function (item) { return item[0]; }),
      alternateRoute: { id: "nh48a", name: "NH48A", towns: ["Peth Naka", "Ichalkaranji", "Kagal"], extraKm: 20, maxRisk: 0.18 }
    },
    {
      id: "chennai-bengaluru", name: "Chennai → Bengaluru", highway: "NH48",
      origin: "Chennai", destination: "Bengaluru", totalKm: 340, segmentIds: chennaiSegments.map(function (item) { return item[0]; }),
      alternateRoute: null
    }
  ];
  const segments = mumbaiSegments.map(function (item, index) { return makeSegment(item, "mumbai-bengaluru", index); })
    .concat(chennaiSegments.map(function (item, index) { return makeSegment(item, "chennai-bengaluru", index); }));
  const segmentById = segments.reduce(function (lookup, segment) {
    lookup[segment.id] = segment;
    return lookup;
  }, {});
  const vehicles = [
    { id: "truck-16", type: "Truck 16 t", category: "truck", speedKmh: 46, floodTolerance: 1, icon: "truck" },
    { id: "truck-25", type: "Truck 25 t multi-axle", category: "truck", speedKmh: 42, floodTolerance: 1.1, icon: "truck" },
    { id: "bus", type: "Bus", category: "bus", speedKmh: 55, floodTolerance: 1.1, icon: "bus" },
    { id: "car-taxi", type: "Car/Taxi", category: "car", speedKmh: 65, floodTolerance: 0.7, icon: "car" },
    { id: "van-lcv", type: "Van/LCV", category: "van", speedKmh: 58, floodTolerance: 0.85, icon: "van" }
  ];
  const users = [
    { id: "dispatcher", role: "Freight Dispatcher", name: "Priya Deshmukh", home: "/dashboard" },
    { id: "operator", role: "Fleet Operator", name: "Arjun Rao", home: "/vehicles" },
    { id: "planner", role: "Highway Planner", name: "Meera Iyer", home: "/hotspots" },
    { id: "researcher", role: "Researcher / Student", name: "Kabir Shah", home: "/model" }
  ];

  const tripRows = [
    ["TRK-2041", "truck-16", "MH-12-AB-4521", "Mumbai", "Bengaluru", "S10", "Sat 06:40", "At risk", "Ramesh Patil", "Western Freight Co.", "98800 12041", "Auto parts", "mumbai-bengaluru"],
    ["TRK-2052", "truck-25", "KA-22-GH-3310", "Belagavi", "Mumbai", "S16", "Fri 23:10", "At risk", "Suresh Naik", "Deccan Logistics", "98800 12052", "Packaged food", "mumbai-bengaluru"],
    ["BUS-3107", "bus", "MH-14-CD-1187", "Pune", "Hubballi", "S07", "Fri 21:30", "Watch", "Anita Jadhav", "Sahyadri Travels", "98800 03107", "42 passengers", "mumbai-bengaluru"],
    ["VAN-5012", "van-lcv", "KA-01-EF-9032", "Bengaluru", "Pune", "S20", "Sat 04:15", "On track", "Naveen Kumar", "QuickCart Fleet", "98800 05012", "Parcel delivery", "mumbai-bengaluru"],
    ["CAR-7088", "car-taxi", "MH-04-JK-7754", "Mumbai", "Satara", "S04", "Fri 15:20", "On track", "Farah Khan", "CityRide", "98800 07088", "3 passengers", "mumbai-bengaluru"],
    ["TRK-2058", "truck-16", "MH-09-LM-2210", "Kolhapur", "Bengaluru", "S13", "Sat 02:50", "Watch", "Vikram Shinde", "Southern Carriers", "98800 12058", "Steel coils", "mumbai-bengaluru"],
    ["TRK-6011", "truck-16", "TN-09-AA-4481", "Chennai", "Bengaluru", "C03", "Fri 19:25", "On track", "Karthik Raj", "Coastal Cargo", "98800 06011", "Electronics", "chennai-bengaluru"],
    ["BUS-6110", "bus", "TN-01-BB-2602", "Chennai", "Bengaluru", "C02", "Fri 18:40", "On track", "Lakshmi Devi", "MetroLink Coaches", "98800 06110", "36 passengers", "chennai-bengaluru"],
    ["CAR-6204", "car-taxi", "KA-03-CC-5190", "Hosur", "Chennai", "C08", "Fri 20:05", "Watch", "Manoj Rao", "CityRide", "98800 06204", "2 passengers", "chennai-bengaluru"],
    ["VAN-6309", "van-lcv", "TN-22-DD-7401", "Vellore", "Bengaluru", "C05", "Fri 22:30", "On track", "Pooja Nair", "QuickCart Fleet", "98800 06309", "Medical supplies", "chennai-bengaluru"]
  ];
  const trips = tripRows.map(function (row, index) {
    const trip = {
      id: row[0], vehicleId: row[1], plate: row[2], origin: row[3], destination: row[4], currentSegment: row[5],
      eta: row[6], status: row[7], driver: row[8], operator: row[9], phone: row[10], cargo: row[11], corridorId: row[12],
      completed: false, timeline: [
        { time: "08:10", title: "Trip departed", detail: "Vehicle began its planned route." },
        { time: "09:25", title: "Route progress updated", detail: "Vehicle position refreshed from synthetic trip data." }
      ]
    };
    if (trip.id === "TRK-2041") trip.timeline.push({ time: "10:02", title: "High-risk segment alert", detail: "S12 forecast risk is high; reroute simulation is available." });
    if (trip.id === "BUS-3107") trip.timeline.push({ time: "09:40", title: "Khambatki Ghat watch", detail: "Afternoon disruption risk is building on S08." });
    if (index === 0) trip.reason = "Crosses S12 during the rain peak";
    return trip;
  });
  for (let index = 1; index <= 8; index += 1) {
    trips.push({
      id: "DONE-" + String(8000 + index), vehicleId: vehicles[index % vehicles.length].id,
      plate: "MH-00-ZZ-" + String(1000 + index), origin: "Pune", destination: "Belagavi", currentSegment: "S18",
      eta: "Completed", status: "Completed", driver: "Driver " + index, operator: "Regional Freight",
      phone: "98800 0800" + index, cargo: index % 2 ? "General cargo" : "Passengers", corridorId: "mumbai-bengaluru",
      completed: true, timeline: [{ time: "07:15", title: "Trip completed", detail: "Delivery closed successfully." }]
    });
  }

  const alerts = [
    { id: "ALT-1001", severity: "High", title: "High disruption risk on S12 Peth Naka – Kolhapur", time: "10:02", segmentId: "S12", tripId: "TRK-2041", corridorId: "mumbai-bengaluru", read: false, closed: false },
    { id: "ALT-1002", severity: "Moderate", title: "Afternoon risk building on S08 Khambatki Ghat", time: "09:40", segmentId: "S08", corridorId: "mumbai-bengaluru", read: false, closed: false },
    { id: "ALT-1003", severity: "Info", title: "IMD rainfall forecast refreshed", time: "09:45", segmentId: "S12", corridorId: "mumbai-bengaluru", read: false, closed: false },
    { id: "ALT-0998", severity: "Moderate", title: "Traffic watch near Pune junction", time: "08:55", segmentId: "S05", corridorId: "mumbai-bengaluru", read: true, closed: false },
    { id: "ALT-0992", severity: "Info", title: "Chennai corridor morning forecast updated", time: "08:30", segmentId: "C07", corridorId: "chennai-bengaluru", read: true, closed: false },
    { id: "ALT-0987", severity: "High", title: "Heavy rain watch cleared on S12", time: "Yesterday 18:10", segmentId: "S12", corridorId: "mumbai-bengaluru", read: true, closed: true },
    { id: "ALT-0971", severity: "Moderate", title: "Fog likelihood elevated near Krishnagiri", time: "Yesterday 06:20", segmentId: "C07", corridorId: "chennai-bengaluru", read: true, closed: true }
  ];
  const scenarios = [
    { id: "SIM-1508", corridorId: "mumbai-bengaluru", type: "Current forecast", vehicleId: "truck-16", date: "Today, 10:04", summary: "112 min saved · on-time 0% → 93%", tripId: "TRK-2041" },
    { id: "SIM-1492", corridorId: "mumbai-bengaluru", type: "Heavy rain", vehicleId: "truck-25", date: "Today, 09:30", summary: "Alternate route avoids the highest-risk segment", tripId: "TRK-2052" },
    { id: "SIM-1468", corridorId: "chennai-bengaluru", type: "Congestion", vehicleId: "bus", date: "Yesterday, 16:12", summary: "Leave before evening traffic builds", tripId: "BUS-6110" },
    { id: "SIM-1441", corridorId: "mumbai-bengaluru", type: "Road closure", vehicleId: "van-lcv", date: "Yesterday, 14:45", summary: "Closure adds 48 min to the default route", tripId: "VAN-5012" },
    { id: "SIM-1390", corridorId: "chennai-bengaluru", type: "Current forecast", vehicleId: "car-taxi", date: "10 Nov, 11:08", summary: "Low route risk · on-time chance 96%", tripId: "CAR-6204" },
    { id: "SIM-1304", corridorId: "mumbai-bengaluru", type: "Heavy rain", vehicleId: "bus", date: "08 Nov, 08:40", summary: "Departure window reduces delay exposure", tripId: "BUS-3107" }
  ];

  const hotspotHistory = segments.map(function (segment, index) {
    const base = segment.id === "S12" ? 18 : segment.id === "S08" ? 14 : segment.id === "C07" ? 9 : 2 + (index * 7 % 8);
    const cause = segment.id === "S12" ? "Flooding" : segment.id === "S08" ? "Ghat landslide" : segment.id === "C07" ? "Fog" : ["Congestion", "Accidents", "Flooding"][index % 3];
    return { segmentId: segment.id, corridorId: segment.corridorId, disruptions90d: base, averageDelayMin: base * 7 + 12, mainCause: cause };
  });
  const modelMetrics = [
    { metric: "Disruption risk", measure: "ROC-AUC · PR-AUC", baseline: "0.680 · 0.051", model: "0.753 · 0.094" },
    { metric: "Delay if disrupted", measure: "MAE (min)", baseline: "24.6", model: "23.6" },
    { metric: "Trip ETA", measure: "MAE (min)", baseline: "9.7 (historical)", model: "8.9" },
    { metric: "Uncertainty (P90)", measure: "Coverage", baseline: "target 0.90", model: "0.92" },
    { metric: "Route quality", measure: "Delay saved · on-time gain", baseline: "default route", model: "−112 min · 0%→93%" },
    { metric: "GenAI grounding", measure: "Unsupported numbers", baseline: "n/a", model: "0 (checked)" }
  ];
  const assistantFacts = {
    s12: { rainProbability: 72, thresholdMmHr: 50, forecastRainMmHr: 58, risk: 0.81, riskSource: "synthetic segment forecast at 10:00 IST" },
    defaultRoute: { delayP50Min: 142, delayP90Min: 210, onTimePercent: 0 },
    alternateRoute: { delayP50Min: 30, delayP90Min: 52, onTimePercent: 93, distanceKm: 993 },
    model: { prAuc: 0.094, rocAuc: 0.753, p90Coverage: 0.92, rareEventPercent: 2 },
    departure: { bestHour: "16:00", expectedDelayMin: 18, onTimePercent: 96 },
    khambatki: { segmentId: "S08", riskAt10: 0.08, riskAt15: 0.45 },
    alternate: { route: "NH48A", extraDistanceKm: 20, delaySavedP50Min: 112 }
  };

  FDT.data = {
    corridors: corridors,
    towns: towns,
    segments: segments,
    segmentById: segmentById,
    vehicles: vehicles,
    users: users,
    trips: trips,
    alerts: alerts,
    scenarios: scenarios,
    hotspotHistory: hotspotHistory,
    modelMetrics: modelMetrics,
    assistantFacts: assistantFacts,
    getCorridor: function (id) { return corridors.find(function (corridor) { return corridor.id === id; }) || corridors[0]; },
    getSegments: function (corridorId) { return segments.filter(function (segment) { return segment.corridorId === corridorId; }); },
    getTrips: function (corridorId) { return trips.filter(function (trip) { return trip.corridorId === corridorId; }); },
    getVehicle: function (id) { return vehicles.find(function (vehicle) { return vehicle.id === id; }) || vehicles[0]; }
  };
}());
