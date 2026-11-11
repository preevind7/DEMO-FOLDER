(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  let activeFilter = "all";

  function statusKind(status) {
    return { "On track": "success", Watch: "warning", "At risk": "danger", Rerouted: "info", Completed: "neutral" }[status] || "neutral";
  }
  function filteredTrips(corridorId) {
    return FDT.data.getTrips(corridorId).filter(function (trip) {
      if (trip.completed) return false;
      if (activeFilter === "all") return true;
      return FDT.data.getVehicle(trip.vehicleId).category === activeFilter;
    });
  }
  function tripStatus(trip) {
    return FDT.state.reroutedTrips.includes(trip.id) ? "Rerouted" : trip.status;
  }
  function appendTripTable(root, trips) {
    const table = document.createElement("table");
    table.className = "data-table dashboard-trip-table";
    table.innerHTML = '<thead><tr><th scope="col">Trip / vehicle</th><th scope="col">Route</th><th scope="col">Now on</th><th scope="col">ETA</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody></tbody>';
    const body = table.querySelector("tbody");
    if (!trips.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.append(FDT.ui.emptyState("No active trips", "Try another vehicle filter or corridor."));
      row.append(cell);
      body.append(row);
    }
    trips.forEach(function (trip) {
      const vehicle = FDT.data.getVehicle(trip.vehicleId);
      const row = document.createElement("tr");
      row.innerHTML =
        '<td data-label="Trip / vehicle"><span class="trip-cell__icon">' + FDT.icon(vehicle.icon) + '</span><span><a class="table-primary-link" href="#/trip/' + encodeURIComponent(trip.id) + '">' + FDT.escapeHtml(trip.id) + '</a><small>' + FDT.escapeHtml(vehicle.type) + ' · ' + FDT.escapeHtml(trip.plate) + '</small></span></td>' +
        '<td data-label="Route">' + FDT.escapeHtml(trip.origin) + ' → ' + FDT.escapeHtml(trip.destination) + '</td>' +
        '<td data-label="Now on"><a href="#/segment/' + encodeURIComponent(trip.currentSegment) + '">' + FDT.escapeHtml(trip.currentSegment) + '</a></td>' +
        '<td data-label="ETA"><span class="number">' + FDT.escapeHtml(trip.eta) + '</span></td>' +
        '<td data-label="Status"><span class="pill pill--' + statusKind(tripStatus(trip)) + '">' + FDT.escapeHtml(tripStatus(trip)) + '</span></td>' +
        '<td data-label="Action"><a class="button button--subtle" href="#/simulator?trip=' + encodeURIComponent(trip.id) + '&segment=S12">Simulate</a></td>';
      body.append(row);
    });
    root.append(table);
  }
  function render(root) {
    const corridor = FDT.data.getCorridor(FDT.state.corridorId);
    const segments = FDT.data.getSegments(corridor.id);
    const activeTrips = FDT.data.getTrips(corridor.id).filter(function (trip) { return !trip.completed; });
    const atRisk = activeTrips.filter(function (trip) { return tripStatus(trip) === "At risk"; });
    const highSegments = segments.filter(function (segment) { return segment.risk[10] >= 0.6; });
    const moderateSegments = segments.filter(function (segment) { return segment.risk[10] >= 0.3 && segment.risk[10] < 0.6; });
    const peak = segments.slice().sort(function (a, b) { return b.risk[10] - a.risk[10]; })[0];
    const displayName = FDT.escapeHtml(FDT.state.user.name.split(/\s+/)[0]);
    root.innerHTML =
      '<header class="page-heading"><div><p class="small muted">Freight Disruption Digital Twin</p><h1>Good morning, ' + displayName + '</h1><p>' + FDT.escapeHtml(FDT.state.user.roleTitle) + ' · ' + FDT.escapeHtml(corridor.highway) + ' · ' + FDT.escapeHtml(corridor.name) + ' · forecast as of 10:00 IST <span class="simulated">Simulated</span></p></div><div class="page-actions"><a class="button" href="#/assistant?context=dashboard">Ask assistant</a><a class="button button--primary" href="#/simulator">New simulation</a></div></header>' +
      '<section class="kpi-grid" aria-label="Corridor summary">' +
      '<article class="kpi-card"><span class="kpi-card__label">Active trips</span><strong class="kpi-card__value number">' + activeTrips.length + '</strong><span class="kpi-card__note">on ' + FDT.escapeHtml(corridor.name) + '</span></article>' +
      '<article class="kpi-card kpi-card--risk"><span class="kpi-card__label">Trips at risk</span><strong class="kpi-card__value number" data-kpi="at-risk">' + atRisk.length + '</strong><span class="kpi-card__note">Includes watch alerts · reroutes reduce this count</span></article>' +
      '<article class="kpi-card"><span class="kpi-card__label">High-risk segments now</span><strong class="kpi-card__value number">' + highSegments.length + ' <span class="kpi-inline-note">+ ' + moderateSegments.length + ' moderate</span></strong><span class="kpi-card__note"><a href="#/segment/' + FDT.escapeHtml((highSegments[0] || peak).id) + '">' + FDT.escapeHtml((highSegments[0] || peak).id) + ' ' + FDT.escapeHtml((highSegments[0] || peak).name) + '</a></span></article>' +
      '<article class="kpi-card"><span class="kpi-card__label">Peak segment risk</span><strong class="kpi-card__value number">' + peak.risk[10].toFixed(2) + '</strong><span class="kpi-card__note"><a href="#/segment/' + FDT.escapeHtml(peak.id) + '">' + FDT.escapeHtml(peak.id + " " + peak.name) + '</a></span></article>' +
      '</section>' +
      '<section class="card dashboard-risk-card"><div class="card__header"><div><h2>Corridor risk right now</h2><p>Danger score by segment · select a block to see details</p></div><span class="simulated">Forecast</span></div><div class="risk-strip-wrap" id="dashboard-risk-strip"></div><div class="risk-strip-ends"><span>' + FDT.escapeHtml(corridor.origin) + '</span><span>' + FDT.escapeHtml(corridor.destination) + '</span></div><div class="risk-legend"><span><i class="legend-swatch legend-swatch--low"></i>Low · under 0.30</span><span><i class="legend-swatch legend-swatch--moderate"></i>Moderate · 0.30–0.59</span><span><i class="legend-swatch legend-swatch--high"></i>High · 0.60+</span></div></section>' +
      '<div class="dashboard-lower-grid"><section class="card dashboard-trips-card"><div class="card__header dashboard-table-header"><div><h2>Active trips</h2><p>' + activeTrips.length + ' vehicles currently in motion</p></div><a href="#/vehicles">View all</a></div><div class="filter-row dashboard-filter-row" role="group" aria-label="Filter active trips">' +
      [["all", "All"], ["truck", "Trucks"], ["bus", "Buses"], ["car", "Cars / Taxis"], ["van", "Vans"]].map(function (item) { return '<button type="button" class="filter-chip" data-trip-filter="' + item[0] + '" aria-pressed="' + String(activeFilter === item[0]) + '">' + item[1] + '</button>'; }).join("") +
      '</div><div class="table-wrap" id="dashboard-trip-table"></div></section>' +
      '<aside class="dashboard-aside"><section class="card"><div class="card__header"><div><h2>Latest alerts</h2><p>Open alerts on this corridor</p></div><a href="#/alerts">See all</a></div><div class="alert-mini-list">' +
      FDT.data.alerts.filter(function (alert) { return alert.corridorId === corridor.id && !alert.closed && !FDT.state.closedAlerts.includes(alert.id); }).slice(0, 3).map(function (alert) {
        return '<article class="alert-mini"><span class="alert-mini__severity alert-mini__severity--' + FDT.escapeHtml(alert.severity.toLowerCase()) + '" aria-label="' + FDT.escapeHtml(alert.severity) + ' alert">' + (alert.severity === "High" ? "!" : alert.severity === "Moderate" ? "△" : "i") + '</span><div><a href="#/segment/' + encodeURIComponent(alert.segmentId) + '">' + FDT.escapeHtml(alert.title) + '</a><small>' + FDT.escapeHtml(alert.time) + ' · ' + FDT.escapeHtml(alert.severity) + '</small></div></article>';
      }).join("") +
      '</div></section><section class="assistant-suggestion"><div class="assistant-suggestion__icon" aria-hidden="true">' + FDT.icon("sparkle") + '</div><div><span class="small">ASSISTANT SUGGESTION</span><h2>Want to know why S12 is risky?</h2><p>Get a plain-language answer grounded in the forecast.</p><a class="button button--light" href="#/assistant?q=' + encodeURIComponent("Why is NH48 segment 12 high risk right now?") + '">Ask this</a></div></section></aside></div>';

    root.querySelector("#dashboard-risk-strip").append(FDT.charts.riskStrip(segments, 10));
    root.querySelectorAll(".risk-strip-wrap svg rect").forEach(function (block, index) {
      const segment = segments[index];
      block.setAttribute("aria-label", segment.id + " " + segment.name + ", risk " + segment.risk[10].toFixed(2) + ", click to view");
      block.setAttribute("role", "link");
      block.setAttribute("tabindex", "0");
      block.addEventListener("click", function () { FDT.router.navigate("/segment/" + segment.id); });
      block.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          FDT.router.navigate("/segment/" + segment.id);
        }
      });
    });
    const designNote = FDT.ui.designNote(1, "The corridor strip makes risk easy to scan; trip filters keep the active fleet list focused.");
    if (designNote) root.append(designNote);
    function updateTrips() {
      const table = root.querySelector("#dashboard-trip-table");
      table.replaceChildren();
      appendTripTable(table, filteredTrips(corridor.id));
    }
    updateTrips();
    root.querySelectorAll("[data-trip-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = button.getAttribute("data-trip-filter");
        root.querySelectorAll("[data-trip-filter]").forEach(function (item) {
          item.setAttribute("aria-pressed", String(item === button));
        });
        updateTrips();
      });
    });
  }

  FDT.pages.dashboard = {
    title: "Dashboard",
    render: render,
    destroy: function () {}
  };
}());
