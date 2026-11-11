(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};

  function statusKind(status) {
    return { "On track": "success", Watch: "warning", "At risk": "danger", Rerouted: "info", Completed: "neutral" }[status] || "neutral";
  }
  function render(root, params) {
    const trip = FDT.data.trips.find(function (item) { return item.id === params.id; });
    if (!trip) {
      root.innerHTML = '<section class="card"><div class="empty-state"><h1>Trip not found</h1><p>This trip ID is not in the local synthetic dataset.</p><a class="button button--primary" href="#/vehicles">Back to Vehicles & Trips</a></div></section>';
      return;
    }

    const corridor = FDT.data.getCorridor(trip.corridorId);
    const vehicle = FDT.data.getVehicle(trip.vehicleId);
    const segment = FDT.data.segmentById[trip.currentSegment];
    const rerouted = FDT.state.reroutedTrips.includes(trip.id);
    const status = rerouted ? "Rerouted" : trip.completed ? "Completed" : trip.status;
    const addedEvents = FDT.state.tripEvents[trip.id] || [];
    const timeline = trip.timeline.concat(addedEvents).slice().reverse();
    const risk = segment ? segment.risk[10] : null;
    const eventsMarkup = timeline.length ? timeline.map(function (event) {
      return '<li class="trip-timeline__item"><span class="trip-timeline__time">' + FDT.escapeHtml(event.time) + '</span><div><strong>' + FDT.escapeHtml(event.title) + '</strong><p>' + FDT.escapeHtml(event.detail) + '</p></div></li>';
    }).join("") : '<li class="trip-timeline__empty">No trip activity has been recorded.</li>';

    root.innerHTML =
      '<header class="page-heading"><div><a class="back-link" href="#/vehicles">← Vehicles & Trips</a><p class="small muted">TRIP RECORD · <span class="simulated">Synthetic data</span></p><h1>' + FDT.escapeHtml(trip.id) + '</h1><p>' + FDT.escapeHtml(trip.origin) + ' → ' + FDT.escapeHtml(trip.destination) + ' · ' + FDT.escapeHtml(corridor.name) + '</p></div><div class="page-actions">' +
      (!trip.completed ? '<a class="button button--primary" href="#/simulator?trip=' + encodeURIComponent(trip.id) + '&segment=' + encodeURIComponent(trip.currentSegment) + '">Simulate trip</a>' : '') +
      '<a class="button" href="#/risk-map">Corridor risk map</a></div></header>' +
      (rerouted ? '<div class="trip-rerouted-notice" role="status"><strong>Reroute applied</strong><span>This local trip is marked Rerouted. Driver notification is simulated.</span></div>' : '') +
      '<section class="trip-overview card"><div class="trip-overview__identity"><span class="trip-overview__icon">' + FDT.icon(vehicle.icon) + '</span><div><h2>' + FDT.escapeHtml(vehicle.type) + '</h2><p>' + FDT.escapeHtml(trip.plate) + '</p></div><span class="pill pill--' + statusKind(status) + '">' + FDT.escapeHtml(status) + '</span></div><div class="trip-overview__route"><span>' + FDT.escapeHtml(trip.origin) + '</span><span class="trip-overview__route-line" aria-hidden="true"></span><span>' + FDT.escapeHtml(trip.destination) + '</span></div></section>' +
      '<div class="trip-detail-grid"><div class="trip-detail-main">' +
      '<section class="card"><div class="card__header"><div><h2>Trip details</h2><p>Current route and vehicle assignment</p></div></div><dl class="trip-facts">' +
      '<div><dt>Current segment</dt><dd>' + (segment ? '<a href="#/segment/' + encodeURIComponent(segment.id) + '">' + FDT.escapeHtml(segment.id + " · " + segment.name) + '</a>' : "—") + '</dd></div>' +
      '<div><dt>Estimated arrival</dt><dd>' + FDT.escapeHtml(trip.eta) + '</dd></div>' +
      '<div><dt>Segment length</dt><dd>' + (segment ? FDT.format.km(segment.km) : "Not available") + '</dd></div>' +
      '<div><dt>Current segment risk</dt><dd>' + (risk === null ? "Not available" : '<span class="pill pill--' + (risk >= 0.6 ? "danger" : risk >= 0.3 ? "warning" : "success") + '">' + risk.toFixed(2) + ' at 10:00</span> <span class="muted small">synthetic</span>') + '</dd></div>' +
      '<div><dt>Driver</dt><dd>' + FDT.escapeHtml(trip.driver) + '</dd></div>' +
      '<div><dt>Fleet operator</dt><dd>' + FDT.escapeHtml(trip.operator) + '</dd></div>' +
      '<div><dt>Cargo / passengers</dt><dd>' + FDT.escapeHtml(trip.cargo) + '</dd></div>' +
      '<div><dt>Vehicle flood tolerance</dt><dd>' + vehicle.floodTolerance.toFixed(2) + '×</dd></div>' +
      '</dl></section>' +
      '<section class="card trip-timeline-card"><div class="card__header"><div><h2>Trip timeline</h2><p>Seeded activity and locally recorded actions</p></div></div><ol class="trip-timeline">' + eventsMarkup + '</ol></section>' +
      '</div><aside class="trip-detail-aside"><section class="card"><div class="card__header"><div><h2>Route context</h2><p>' + FDT.escapeHtml(corridor.highway) + ' · ' + corridor.totalKm + ' km corridor</p></div></div>' +
      '<p><strong>Current segment:</strong> ' + (segment ? FDT.escapeHtml(segment.name) : "Not available") + '</p>' +
      '<p><strong>Forecast rainfall:</strong> ' + (segment ? FDT.format.mmHr(segment.rainMmHr[10]) : "Not available") + '</p>' +
      '<p><strong>Flood threshold:</strong> ' + (segment ? FDT.format.mmHr(segment.floodThresholdMmHr) : "Not available") + '</p>' +
      '<div class="trip-aside-actions"><a class="button button--wide" href="#/segment/' + encodeURIComponent(trip.currentSegment) + '">View segment forecast</a>' +
      (!trip.completed ? '<a class="button button--primary button--wide" href="#/simulator?trip=' + encodeURIComponent(trip.id) + '&segment=' + encodeURIComponent(trip.currentSegment) + '">Run trip simulation</a>' : '') + '</div>' +
      '<p class="small muted trip-prototype-note">Position, ETA and forecast details are synthetic. This prototype does not contact drivers or dispatch vehicles.</p></section></aside></div>';
  }

  FDT.pages.trip = {
    title: "Trip detail",
    render: render,
    destroy: function () {}
  };
}());
