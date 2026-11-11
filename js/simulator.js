(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};

  function hashSeed(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function normalSample(random) {
    const first = Math.max(Number.EPSILON, random());
    const second = random();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  }
  function makeLognormalSamples(random, runs, median, p90) {
    const sigma = Math.log(p90 / median) / 1.2816;
    const samples = Array.from({ length: runs }, function () {
      return Math.max(0, Math.exp(Math.log(median) + sigma * normalSample(random)));
    });
    const sampleMedian = FDT.percentile(samples, 0.5);
    const sampleP90 = FDT.percentile(samples, 0.9);
    const calibration = Math.log(p90 / median) / Math.log(sampleP90 / sampleMedian);
    return samples.map(function (sample) {
      return median * Math.pow(sample / sampleMedian, calibration);
    });
  }
  function makeHistogram(routes, binCount) {
    const allSamples = [];
    routes.forEach(function (route) { allSamples.push.apply(allSamples, route.samples); });
    const maximum = Math.max(1, ...allSamples);
    const binWidth = maximum / binCount;
    return {
      binWidth: binWidth,
      maxMinutes: binWidth * binCount,
      bins: routes.map(function (route) {
        const values = Array.from({ length: binCount }, function () { return 0; });
        route.samples.forEach(function (sample) {
          const index = Math.min(binCount - 1, Math.floor(sample / binWidth));
          values[index] += 1;
        });
        return { name: route.name, color: route.color, values: values };
      })
    };
  }

  FDT.simulator = {
    simulate: function (inputs) {
      const source = Object.assign({}, inputs || {});
      const corridor = FDT.data.getCorridor(source.corridorId || FDT.state.corridorId);
      const runs = [100, 500, 1000, 5000].includes(Number(source.runs)) ? Number(source.runs) : 1000;
      const vehicle = FDT.data.getVehicle(source.vehicleId || "truck-16");
      const requestedSegment = FDT.data.segmentById[(source.segmentId || "S12").toUpperCase()];
      const segment = requestedSegment && requestedSegment.corridorId === corridor.id ? requestedSegment : FDT.data.getSegments(corridor.id)[0];
      const scenario = ["current", "heavy-rain", "closure", "congestion"].includes(source.scenario) ? source.scenario : "current";
      const rainMmHr = Math.max(0, Number(source.rainMmHr === undefined ? segment.rainMmHr[10] : source.rainMmHr));
      const closureHours = Math.max(0, Number(source.closureHours) || 0);
      const speedDropPercent = Math.min(90, Math.max(0, Number(source.speedDropPercent) || 0));
      const requestedDepartureHour = Number(source.departureHour);
      const departureHour = Number.isFinite(requestedDepartureHour) ? Math.min(23, Math.max(0, requestedDepartureHour)) : 10;
      const deadlineHours = Math.max(0, Number(source.deadlineHours) || 22.25);
      const compareAlternate = source.compareAlternate !== false;
      const rainMultiplier = 1 + Math.max(0, rainMmHr - 58) * 0.012;
      const scenarioMultiplier = scenario === "heavy-rain" ? 1 + Math.max(0.35, (rainMmHr - 58) * 0.012) :
        scenario === "congestion" ? 1 + speedDropPercent / 100 * 1.6 : 1;
      const closureDelay = scenario === "closure" ? Math.max(1, closureHours) * 60 : 0;
      const departureMultiplier = departureHour >= 10 && departureHour <= 15 ? 1 : 0.62;
      const toleranceMultiplier = 1 / vehicle.floodTolerance;
      const defaultS12 = segment.id === "S12" && scenario === "current" && vehicle.id === "truck-16" && rainMmHr === 58 && departureHour === 10;

      let defaultId = 1508;
      if (FDT.state.simulations.length) {
        const ids = FDT.state.simulations.map(function (item) { return Number(String(item.simId).replace(/\D/g, "")) || 1508; });
        defaultId = Math.max.apply(null, ids) + 1;
      }
      const simId = "SIM-" + defaultId;
      const seedValues = [corridor.id, segment.id, vehicle.id, scenario, runs, rainMmHr, closureHours, speedDropPercent, departureHour, deadlineHours, compareAlternate].join("|");
      const random = FDT.mulberry32(hashSeed(seedValues));
      const base = defaultS12
        ? { routeA: { median: 142, p90: 210, risk: 0.81 }, routeB: { median: 30, p90: 52, risk: 0.18 } }
        : { routeA: { median: 45 + segment.risk[departureHour] * 120, p90: 80 + segment.risk[departureHour] * 165, risk: segment.risk[departureHour] }, routeB: { median: 30 + segment.risk[departureHour] * 10, p90: 52 + segment.risk[departureHour] * 18, risk: Math.min(0.3, segment.risk[departureHour] * 0.22) } };
      function routeStats(routeName, km, routeBase, isAlternate) {
        const rainEffect = isAlternate ? 1 + Math.max(0, rainMmHr - 58) * 0.003 : rainMultiplier;
        const multiplier = scenarioMultiplier * departureMultiplier * toleranceMultiplier * rainEffect;
        const median = Math.max(5, routeBase.median * multiplier + closureDelay);
        const p90 = Math.max(median * 1.05, routeBase.p90 * multiplier + closureDelay);
        const samples = makeLognormalSamples(random, runs, median, p90);
        const buffer = Math.max(-1440, (deadlineHours - km / vehicle.speedKmh) * 60);
        const onTimeCount = samples.reduce(function (count, sample) { return count + (sample <= buffer ? 1 : 0); }, 0);
        return {
          name: routeName,
          km: km,
          p50: FDT.percentile(samples, 0.5),
          p90: FDT.percentile(samples, 0.9),
          onTime: Math.round(onTimeCount / runs * 100),
          maxRisk: routeBase.risk,
          samples: samples,
          onTimeBufferMin: buffer,
          targetP50: median,
          targetP90: p90,
          color: isAlternate ? "var(--green)" : "var(--red)"
        };
      }
      const routes = [routeStats("Default · NH48", corridor.totalKm, base.routeA, false)];
      if (compareAlternate && corridor.alternateRoute) {
        const alternateKm = corridor.totalKm + (corridor.alternateRoute ? corridor.alternateRoute.extraKm : 20);
        routes.push(routeStats("Alternate · NH48A", alternateKm, base.routeB, true));
      }
      const recommended = routes.length > 1 && (routes[1].p50 < routes[0].p50 || routes[1].onTime > routes[0].onTime) ? 1 : 0;
      const delaySaved = routes.length > 1 ? Math.max(0, Math.round(routes[0].p50 - routes[1].p50)) : 0;
      const result = {
        simId: simId,
        runs: runs,
        corridorId: corridor.id,
        corridorName: corridor.name,
        segmentId: segment.id,
        vehicleId: vehicle.id,
        tripId: source.tripId || "",
        linkedTrip: source.linkedTrip || null,
        scenario: scenario,
        inputs: {
          departureHour: departureHour, deadlineHours: deadlineHours, rainMmHr: rainMmHr,
          closureHours: closureHours, speedDropPercent: speedDropPercent, compareAlternate: compareAlternate,
          generateExplanation: source.generateExplanation !== false
        },
        routes: routes,
        recommended: recommended,
        delaySaved: delaySaved,
        histogramBins: makeHistogram(routes, 24),
        createdAt: new Date().toISOString(),
        durationSeconds: 1.7
      };
      return result;
    }
  };
}());
