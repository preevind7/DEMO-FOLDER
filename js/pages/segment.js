(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  function riskKind(risk) {
    return risk >= 0.6 ? "high" : risk >= 0.3 ? "moderate" : "low";
  }
  function render(root, params) {
    const segment = FDT.data.segmentById[(params.id || "").toUpperCase()];
    if (!segment) {
      root.innerHTML = '<section class="error-state" role="alert"><h1>Segment not found</h1><p>We could not find that highway segment in the pilot corridors.</p><a class="button" href="#/risk-map">Back to Corridor Risk Map</a></section>';
      return;
    }
    const corridor = FDT.data.getCorridor(segment.corridorId);
    const hour = 10;
    const risk = segment.risk[hour];
    const rain = segment.rainMmHr[hour];
    const rainProbability = Math.round(segment.rainProbability[hour] * 100);
    const watched = FDT.state.watchedSegments.includes(segment.id);
    const affectedTrips = segment.id === "S12"
      ? ["TRK-2041", "TRK-2052", "BUS-3107", "TRK-2058"]
      : FDT.data.getTrips(corridor.id).filter(function (trip) { return !trip.completed; }).filter(function (trip) { return trip.currentSegment === segment.id; }).map(function (trip) { return trip.id; });
    const trips = affectedTrips.map(function (id) { return FDT.data.trips.find(function (trip) { return trip.id === id; }); }).filter(Boolean);
    const contributionItems = segment.id === "S12"
      ? [
        { label: "Historical baseline", value: 0.07 },
        { label: "Forecast rainfall vs flood threshold", value: 0.42 },
        { label: "Past flooding on this segment", value: 0.21 },
        { label: "Night-time travel", value: 0.06 },
        { label: "Heavy-vehicle share", value: 0.05 }
      ]
      : [
        { label: "Historical baseline", value: segment.historicalBaseline },
        { label: "Forecast rainfall effect", value: Math.max(0, risk - segment.historicalBaseline - segment.pastFloodScore) },
        { label: "Past disruption patterns", value: segment.pastFloodScore },
        { label: "Time and traffic effect", value: Math.max(0, risk - segment.historicalBaseline - segment.pastFloodScore) * 0.25 }
      ];
    const contributionTotal = contributionItems.reduce(function (sum, item) { return sum + item.value; }, 0);

    root.innerHTML =
      '<header class="page-heading segment-heading"><div><a class="back-link" href="#/risk-map">← Corridor map</a><p class="small muted">' + FDT.escapeHtml(corridor.name) + ' · ' + segment.km + ' km · forecast hour 10:00</p><h1>' + FDT.escapeHtml(segment.id + " · " + segment.name) + '</h1><p>Flood threshold ' + segment.floodThresholdMmHr + ' mm/hr · ' + FDT.escapeHtml(corridor.highway) + '</p></div><div class="page-actions"><button type="button" class="button" id="watch-segment" aria-pressed="' + String(watched) + '">' + (watched ? "Stop watching" : "Watch") + '</button><a class="button" href="#/assistant?q=' + encodeURIComponent("Why is " + corridor.highway + " " + segment.id + " high risk right now?") + '&segment=' + encodeURIComponent(segment.id) + '">Ask assistant</a><a class="button button--primary" href="#/simulator?segment=' + encodeURIComponent(segment.id) + '&trip=' + encodeURIComponent(trips[0] ? trips[0].id : "") + '">Simulate reroute</a></div></header>' +
      (risk >= 0.6 ? '<section class="risk-warning" role="status"><span class="risk-warning__icon" aria-hidden="true">!</span><div><strong>High disruption risk.</strong> ' + trips.length + ' active trips may cross this segment. Run a reroute simulation to compare options.</div></section>' : "") +
      '<section class="kpi-grid segment-kpi-grid" aria-label="Segment forecast"><article class="kpi-card"><span class="kpi-card__label">Disruption risk <small>P (disruption)</small></span><strong class="kpi-card__value number">' + risk.toFixed(2) + '</strong><span class="pill pill--' + riskKind(risk) + '">' + (risk >= 0.6 ? "High" : risk >= 0.3 ? "Moderate" : "Low") + ' risk</span></article>' +
      '<article class="kpi-card"><span class="kpi-card__label">Rain probability (3 h)</span><strong class="kpi-card__value number">' + rainProbability + '%</strong><span class="kpi-card__note">IMD forecast <span class="simulated">Simulated</span></span></article>' +
      '<article class="kpi-card"><span class="kpi-card__label">Forecast rainfall</span><strong class="kpi-card__value number">' + rain + ' <span class="kpi-unit">mm/hr</span></strong><span class="kpi-card__note">Threshold ' + segment.floodThresholdMmHr + ' mm/hr · ' + (rain > segment.floodThresholdMmHr ? "above" : "below") + '</span></article>' +
      '<article class="kpi-card"><span class="kpi-card__label">Delay if disrupted</span><strong class="kpi-card__value number">' + (segment.id === "S12" ? "142" : Math.round(35 + risk * 110)) + ' min</strong><span class="kpi-card__note">P50 · P90 ' + (segment.id === "S12" ? "210" : Math.round(60 + risk * 150)) + ' min</span></article></section>' +
      '<div class="segment-chart-grid"><section class="card"><div class="card__header"><div><h2>Risk, next 24 h</h2><p>Danger score · dashed line is the high-risk threshold</p></div><span class="simulated">Forecast</span></div><div id="segment-risk-chart"></div></section>' +
      '<section class="card"><div class="card__header"><div><h2>Forecast rainfall</h2><p>Rainfall in mm/hr · dashed line is the flood threshold</p></div><span class="simulated">Forecast</span></div><div id="segment-rain-chart"></div></section></div>' +
      '<div class="segment-details-grid"><section class="card"><div class="card__header"><div><h2>What drives this score</h2><p>Model contribution · values add up to this segment danger score</p></div><strong class="number">' + contributionTotal.toFixed(2) + ' total</strong></div><div id="segment-contributions"></div></section>' +
      '<section class="card vehicle-impact-card"><div class="card__header"><div><h2>How each vehicle type is affected</h2><p>Higher flood tolerance means less expected disruption</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Vehicle</th><th scope="col">Flood tolerance</th><th scope="col">Expected delay</th></tr></thead><tbody>' +
      FDT.data.vehicles.map(function (vehicle) {
        const delay = Math.round(142 / vehicle.floodTolerance);
        return '<tr><td data-label="Vehicle">' + FDT.icon(vehicle.icon) + '<span>' + FDT.escapeHtml(vehicle.type) + '</span></td><td class="number" data-label="Flood tolerance">' + vehicle.floodTolerance.toFixed(2) + '×</td><td class="number" data-label="Expected delay">' + delay + ' min</td></tr>';
      }).join("") +
      '</tbody></table></div></section></div>' +
      '<section class="card segment-trips-card"><div class="card__header"><div><h2>Trips that will cross this segment</h2><p>' + trips.length + ' active trips in the synthetic corridor plan</p></div><a href="#/vehicles">All vehicles</a></div><div class="segment-trip-list">' +
      (trips.length ? trips.map(function (trip) {
        const vehicle = FDT.data.getVehicle(trip.vehicleId);
        const status = FDT.state.reroutedTrips.includes(trip.id) ? "Rerouted" : trip.status;
        const badge = status === "At risk" ? "danger" : status === "Watch" ? "warning" : status === "Rerouted" ? "info" : "success";
        return '<article class="segment-trip"><span class="trip-cell__icon">' + FDT.icon(vehicle.icon) + '</span><div class="segment-trip__main"><a href="#/trip/' + encodeURIComponent(trip.id) + '">' + FDT.escapeHtml(trip.id) + ' · ' + FDT.escapeHtml(trip.plate) + '</a><small>' + FDT.escapeHtml(trip.origin) + ' → ' + FDT.escapeHtml(trip.destination) + ' · now on ' + FDT.escapeHtml(trip.currentSegment) + '</small></div><span class="pill pill--' + badge + '">' + FDT.escapeHtml(status) + '</span><a class="button button--subtle" href="#/simulator?trip=' + encodeURIComponent(trip.id) + '&segment=' + encodeURIComponent(segment.id) + '">Simulate</a></article>';
      }).join("") : '<div class="empty-state"><h3>No trips to show</h3><p>There are no active trips on this corridor.</p></div>') +
      '</div></section>';

    root.querySelector("#segment-risk-chart").append(FDT.charts.line({ label: "Disruption risk over the next 24 hours", values: segment.risk, threshold: 0.6, color: "var(--blue)", min: 0, max: 1 }));
    root.querySelector("#segment-rain-chart").append(FDT.charts.bar({ label: "Forecast rainfall over the next 24 hours", values: segment.rainMmHr, threshold: segment.floodThresholdMmHr, max: Math.max(65, segment.floodThresholdMmHr + 5), color: "var(--blue)" }));
    root.querySelector("#segment-contributions").append(FDT.charts.contributions(contributionItems));
    const watchButton = root.querySelector("#watch-segment");
    watchButton.addEventListener("click", function () {
      const isWatching = FDT.state.watchedSegments.includes(segment.id);
      FDT.store.update(function (state) {
        state.watchedSegments = isWatching
          ? state.watchedSegments.filter(function (id) { return id !== segment.id; })
          : state.watchedSegments.concat(segment.id);
      });
      watchButton.setAttribute("aria-pressed", String(!isWatching));
      watchButton.textContent = isWatching ? "Watch" : "Stop watching";
      FDT.toast(isWatching ? segment.id + " removed from your watch list." : "Now watching " + segment.id + ".");
    });
    const note = FDT.ui.designNote(1, "The risk trend and factor bars show both the forecast and why it is elevated.");
    if (note) root.append(note);
  }

  FDT.pages.segment = {
    title: "Segment detail",
    render: render,
    destroy: function () {}
  };
}());
