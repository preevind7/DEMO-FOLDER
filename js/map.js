(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  const NS = "http://www.w3.org/2000/svg";
  function makeNode(name, attributes, text) {
    const element = document.createElementNS(NS, name);
    Object.entries(attributes || {}).forEach(function (entry) { element.setAttribute(entry[0], entry[1]); });
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function riskColor(value) {
    return value >= 0.6 ? "var(--red)" : value >= 0.3 ? "var(--amber)" : "var(--green)";
  }
  function vehiclePath(type) {
    if (type === "bus") return "M5 4h14v15H5zM5 9h14M8 19v2m8-2v2";
    if (type === "car") return "M5 11 7 6h10l2 5 2 1v5H3v-5l2-1Zm2 0h10";
    if (type === "van") return "M3 7h12v10H3zM15 10h4l3 3v4h-7z";
    return "M3 7h12v10H3zM15 10h4l3 3v4h-7z";
  }

  FDT.map = {
    render: function (options) {
      const corridor = FDT.data.getCorridor(options.corridorId);
      const segments = FDT.data.getSegments(corridor.id);
      const hour = Math.min(23, Math.max(0, Number(options.hour) || 0));
      const width = 820;
      const height = 580;
      const margin = 58;
      const points = [];
      segments.forEach(function (segment) { points.push(segment.start, segment.end); });
      const lats = points.map(function (point) { return point.lat; });
      const lons = points.map(function (point) { return point.lon; });
      const minLat = Math.min.apply(null, lats);
      const maxLat = Math.max.apply(null, lats);
      const minLon = Math.min.apply(null, lons);
      const maxLon = Math.max.apply(null, lons);
      const project = function (point) {
        return {
          x: margin + (point.lon - minLon) / (maxLon - minLon || 1) * (width - margin * 2),
          y: height - margin - (point.lat - minLat) / (maxLat - minLat || 1) * (height - margin * 2)
        };
      };
      const svg = makeNode("svg", { viewBox: "0 0 " + width + " " + height, role: "img", "aria-label": corridor.name + " route map with segment disruption risk" });
      svg.append(makeNode("rect", { x: 0, y: 0, width: width, height: height, rx: 12, fill: "var(--canvas)" }));
      segments.forEach(function (segment) {
        const a = project(segment.start);
        const b = project(segment.end);
        const link = makeNode("a", { href: "#/segment/" + encodeURIComponent(segment.id), "aria-label": "Open segment " + segment.id + " " + segment.name });
        const line = makeNode("line", {
          x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: riskColor(segment.risk[hour]),
          "stroke-width": segment.risk[hour] >= 0.6 ? 8 : 6, "stroke-linecap": "round",
          "data-segment-id": segment.id,
          "aria-label": segment.id + " " + segment.name + ", risk " + segment.risk[hour].toFixed(2)
        });
        line.append(makeNode("title", {}, segment.id + " · " + segment.name + " · risk " + segment.risk[hour].toFixed(2) + " · select to view segment"));
        link.append(line);
        svg.append(link);
      });
      const routePoints = corridor.segmentIds.map(function (id) { return FDT.data.segmentById[id].start; });
      routePoints.push(segments[segments.length - 1].end);
      const alternate = corridor.alternateRoute;
      if (alternate) {
        const alternatePoints = [FDT.data.towns[alternate.towns[0]], FDT.data.towns[alternate.towns[1]], FDT.data.towns[alternate.towns[2]]];
        const offset = alternatePoints.map(function (point, index) {
          const p = project({ lat: point[0], lon: point[1] });
          return (index === 1 ? p.x - 26 : p.x) + "," + (index === 1 ? p.y - 20 : p.y);
        }).join(" ");
        svg.append(makeNode("polyline", { points: offset, fill: "none", stroke: "var(--blue)", "stroke-width": 3, "stroke-dasharray": "8 7", "stroke-linecap": "round", "data-route": "NH48A", "aria-label": "Alternate route NH48A via Ichalkaranji" }));
        svg.append(makeNode("text", { x: project({ lat: alternatePoints[1][0], lon: alternatePoints[1][1] }).x - 56, y: project({ lat: alternatePoints[1][0], lon: alternatePoints[1][1] }).y - 31, fill: "var(--blue)", "font-size": 12, "font-weight": 700 }, "NH48A alternate"));
      }
      const townsSeen = new Set();
      segments.forEach(function (segment) {
        [segment.start, segment.end].forEach(function (point) {
          const key = point.lat + "," + point.lon;
          if (townsSeen.has(key)) return;
          townsSeen.add(key);
          const p = project(point);
          svg.append(makeNode("circle", { cx: p.x, cy: p.y, r: 4, fill: "var(--surface)", stroke: "var(--navy)", "stroke-width": 2 }));
          if (p.y < margin + 18 || p.y > height - margin - 14) return;
          const segmentForTown = segments.find(function (item) { return item.start.lat === point.lat && item.start.lon === point.lon; }) || segment;
          const townLabel = point.lat === segmentForTown.end.lat && point.lon === segmentForTown.end.lon ? segmentForTown.to : segmentForTown.from;
          svg.append(makeNode("text", { x: p.x + 7, y: p.y - 7, fill: "var(--text)", "font-size": 10 }, townLabel));
        });
      });
      (options.trips || []).filter(function (trip) { return trip.corridorId === corridor.id && !trip.completed; }).forEach(function (trip, index) {
        const segment = FDT.data.segmentById[trip.currentSegment];
        if (!segment) return;
        const a = project(segment.start);
        const b = project(segment.end);
        const x = (a.x + b.x) / 2;
        const y = (a.y + b.y) / 2 + (index % 3) * 16;
        const group = makeNode("a", { href: "#/trip/" + encodeURIComponent(trip.id), "aria-label": "Open trip " + trip.id });
        group.append(makeNode("circle", { cx: x, cy: y, r: 10, fill: "var(--navy)", stroke: "var(--surface)", "stroke-width": 2 }));
        group.append(makeNode("path", {
          d: vehiclePath(FDT.data.getVehicle(trip.vehicleId).category),
          transform: "translate(" + (x - 6) + " " + (y - 6) + ") scale(.5)",
          fill: "none", stroke: "var(--surface)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round",
          "aria-hidden": "true"
        }));
        group.append(makeNode("text", { x: x + 13, y: y + 4, fill: "var(--navy)", "font-size": 10, "font-weight": 700 }, trip.id));
        group.append(makeNode("title", {}, trip.id + " · " + trip.plate + " · " + trip.status));
        svg.append(group);
      });
      const wrapper = document.createElement("div");
      wrapper.className = "corridor-map";
      wrapper.append(svg);
      return wrapper;
    }
  };
}());
